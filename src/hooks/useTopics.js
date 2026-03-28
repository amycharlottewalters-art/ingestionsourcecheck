import { useState } from "react";
import { callClaudeFull } from "../lib/claude.js";
import { makeSupabase } from "../lib/supabase.js";
import { slugify } from "../lib/utils.js";
import { DOMAINS } from "../constants.js";

const REFERENCE_TOPICS_QUERY =
  "/rest/v1/topics?select=topic_id,topic_name,topic_display_name,topic_description,domain,adjacent_topic_ids&is_active=eq.true&order=domain,topic_id";

const MANAGED_TOPICS_QUERY =
  "/rest/v1/topics?select=topic_id,topic_name,topic_display_name,topic_description,domain,adjacent_topic_ids,is_active&order=domain,topic_display_name";

const EMPTY_NEW_TOPIC = {
  topic_display_name: "", topic_name: "", topic_description: "", domain: "galilean-ministry",
};

// Strip JSON fences and parse; throws on malformed JSON.
function parseJsonResult(raw) {
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

export function useTopics(config) {
  // ── Topic lists ──────────────────────────────────────────────────────────────
  // allTopics: lightweight reference list (ingestion workflow, dropdowns).
  // allTopicsManaged: full list including inactive (Topics tab management).
  const [allTopics, setAllTopics] = useState([]);
  const [allTopicsManaged, setAllTopicsManaged] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState("");

  // ── Add-topic panel ───────────────────────────────────────────────────────────
  const [addTopicOpen, setAddTopicOpen] = useState(false);
  const [addTopicPrefill, setAddTopicPrefill] = useState(null);
  const [newTopic, setNewTopic] = useState(EMPTY_NEW_TOPIC);
  const [newTopicAdjacent, setNewTopicAdjacent] = useState([]);
  const [suggestingAdjacent, setSuggestingAdjacent] = useState(false);
  const [suggestingDescription, setSuggestingDescription] = useState(false);
  const [adjacentSuggested, setAdjacentSuggested] = useState(false);

  // ── Inline edit ───────────────────────────────────────────────────────────────
  const [editingTopic, setEditingTopic] = useState(null);
  const [editTopicData, setEditTopicData] = useState({});
  const [editTopicAdjacent, setEditTopicAdjacent] = useState([]);
  const [editSuggestingAdjacent, setEditSuggestingAdjacent] = useState(false);
  const [editSuggestingDescription, setEditSuggestingDescription] = useState(false);

  const db = () => makeSupabase(config.supabaseUrl, config.supabaseKey);

  // ── Data loading ──────────────────────────────────────────────────────────────

  async function loadReferenceTopics() {
    try {
      const rows = await db().get(REFERENCE_TOPICS_QUERY);
      setAllTopics(rows);
      return rows;
    } catch (e) {
      setTopicsError("loadReferenceTopics failed: " + e.message);
      return [];
    }
  }

  async function loadAllTopicsManaged() {
    setTopicsLoading(true);
    setTopicsError("");
    try {
      const rows = await db().get(MANAGED_TOPICS_QUERY);
      setAllTopicsManaged(rows);
      setTopicsLoading(false);
      return rows;
    } catch (e) {
      setTopicsError("loadAllTopicsManaged failed: " + e.message);
      setTopicsLoading(false);
    }
  }

  // ── Claude suggestions ─────────────────────────────────────────────────────────

  async function suggestTopicDescriptionAndDomain(displayName, onResult, onLoading) {
    onLoading(true);
    try {
      const domainList = DOMAINS.map(d => d.slug + " -- " + d.label).join("\n");
      const prompt =
        "You are maintaining a theological topic taxonomy for a Christian devotional app grounded in Historical Jesus scholarship.\n\n" +
        "The available domains are:\n" + domainList + "\n\n" +
        "For the topic named \"" + displayName + "\", provide:\n" +
        "1. The most appropriate domain slug from the list above\n" +
        "2. A one-sentence description (max 20 words) defining the topic\n\n" +
        "Respond with ONLY valid JSON in this exact format, no prose before or after:\n" +
        "{\"domain\": \"domain-slug-here\", \"description\": \"One sentence description here.\"}";
      const result = await callClaudeFull(config.anthropicKey, {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.2,
      });
      const parsed = parseJsonResult(result);
      onResult({ domain: parsed.domain || "galilean-ministry", description: parsed.description || "" });
    } catch (e) {
      setTopicsError("Suggestion failed: " + e.message);
    }
    onLoading(false);
  }

  async function suggestAdjacentTopics(displayName, description, domain, existingTopics, onResult, onLoading) {
    onLoading(true);
    try {
      const topicList = existingTopics
        .map(t => t.topic_id + " | " + t.topic_display_name + " | " + t.domain + " | " + t.topic_description)
        .join("\n");
      const prompt =
        "You are helping maintain a theological topic taxonomy for a devotional app.\n\n" +
        "A new topic is being added:\nName: " + displayName + "\nDescription: " + description + "\nDomain: " + domain + "\n\n" +
        "Here are all existing topics (topic_id | display_name | domain | description):\n" + topicList + "\n\n" +
        "Which existing topics are ADJACENT to this new topic? Be conservative: only flag genuine ambiguity cases.\n\n" +
        "Respond with ONLY a JSON array of topic_ids (integers). Example: [42, 67, 103]\n" +
        "If no adjacencies exist, respond with: []";
      const result = await callClaudeFull(config.anthropicKey, {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.2,
      });
      const ids = parseJsonResult(result);
      onResult(ids.map(Number).filter(id => existingTopics.find(t => t.topic_id === id)));
    } catch (e) {
      setTopicsError("Adjacent topic suggestion failed: " + e.message);
      onResult([]);
    }
    onLoading(false);
  }

  // Single Claude call that returns description, domain, AND adjacent topic IDs —
  // saves the user one API round-trip when adding a new topic.
  async function suggestTopicAll(displayName, existingTopics, onResult, onLoading) {
    if (!displayName.trim()) return;
    onLoading(true);
    try {
      let freshTopics = existingTopics;
      if (!freshTopics?.length) {
        // Fetch directly without triggering the list spinner.
        try {
          freshTopics = await db().get(MANAGED_TOPICS_QUERY);
          setAllTopicsManaged(freshTopics);
        } catch {
          freshTopics = [];
        }
      }

      const topicList = freshTopics
        .filter(t => t.is_active)
        .map(t => t.topic_id + " | " + t.topic_display_name + " | " + t.domain + " | " + (t.topic_description || ""))
        .join("\n");
      const domainList = DOMAINS.map(d => d.slug + " -- " + d.label).join("\n");

      const prompt = [
        "You are maintaining a theological topic taxonomy for a Christian devotional app grounded in Historical Jesus scholarship.",
        "",
        "A new topic is being added: \"" + displayName + "\"",
        "",
        "Available domains:",
        domainList,
        "",
        "Existing topics (topic_id | display_name | domain | description):",
        topicList,
        "",
        "Please provide all three of the following in a single JSON response:",
        "1. The best domain slug for this topic",
        "2. A one-sentence description (max 20 words) defining the topic",
        "3. A list of topic_ids from the existing topics that are ADJACENT to this new topic (only genuine ambiguity cases — be conservative)",
        "",
        "Respond with ONLY valid JSON, no prose before or after:",
        "{",
        "  \"domain\": \"domain-slug-here\",",
        "  \"description\": \"One sentence description here.\",",
        "  \"adjacent_topic_ids\": [42, 67, 103]",
        "}",
        "If no adjacencies exist, use an empty array: \"adjacent_topic_ids\": []",
      ].join("\n");

      const result = await callClaudeFull(config.anthropicKey, {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.2,
      });

      const parsed = parseJsonResult(result);
      const domain = parsed.domain || "galilean-ministry";
      const description = parsed.description || "";
      const adjacentIds = (parsed.adjacent_topic_ids || [])
        .map(Number)
        .filter(id => freshTopics.find(t => t.topic_id === id));
      const suggestedTopics = freshTopics.filter(t => adjacentIds.includes(t.topic_id));

      onResult({ domain, description, adjacentIds, suggestedTopics, allFetchedTopics: freshTopics });
    } catch (e) {
      setTopicsError("Topic suggestion failed: " + e.message);
    }
    onLoading(false);
  }

  // ── Add / edit / toggle ───────────────────────────────────────────────────────

  async function addTopic() {
    if (!newTopic.topic_display_name.trim()) { setTopicsError("Display name is required."); return; }
    if (!newTopic.topic_description.trim()) { setTopicsError("Description is required."); return; }
    if (!newTopic.topic_name.trim()) { setTopicsError("Slug is required."); return; }
    try {
      await db().post("/rest/v1/topics", {
        topic_name: newTopic.topic_name.trim(),
        topic_display_name: newTopic.topic_display_name.trim(),
        topic_description: newTopic.topic_description.trim(),
        domain: newTopic.domain,
        adjacent_topic_ids: newTopicAdjacent,
        is_active: true,
      });

      // Back-link adjacent topics to the newly created row.
      const newRow = await db().get(
        "/rest/v1/topics?topic_name=eq." + encodeURIComponent(newTopic.topic_name.trim()) + "&select=topic_id"
      );
      if (newRow[0] && newTopicAdjacent.length > 0) {
        const newId = newRow[0].topic_id;
        for (const adjId of newTopicAdjacent) {
          const adjTopic = allTopicsManaged.find(t => t.topic_id === adjId);
          if (adjTopic) {
            const updatedAdj = [...new Set([...(adjTopic.adjacent_topic_ids || []), newId])];
            await db().patch("/rest/v1/topics?topic_id=eq." + adjId, { adjacent_topic_ids: updatedAdj });
          }
        }
      }

      setNewTopic(EMPTY_NEW_TOPIC);
      setNewTopicAdjacent([]);
      setAdjacentSuggested(false);
      setAddTopicOpen(false);
      setAddTopicPrefill(null);
      await loadAllTopicsManaged();
      await loadReferenceTopics();
    } catch (e) {
      setTopicsError("addTopic failed: " + e.message);
    }
  }

  async function saveTopicEdit(topicId) {
    try {
      await db().patch("/rest/v1/topics?topic_id=eq." + topicId, {
        ...editTopicData,
        adjacent_topic_ids: editTopicAdjacent,
      });
      setEditingTopic(null);
      setEditTopicData({});
      setEditTopicAdjacent([]);
      await loadAllTopicsManaged();
      await loadReferenceTopics();
    } catch (e) {
      setTopicsError("saveTopicEdit failed: " + e.message);
    }
  }

  async function toggleTopicActive(topic) {
    try {
      await db().patch("/rest/v1/topics?topic_id=eq." + topic.topic_id, { is_active: !topic.is_active });
      await loadAllTopicsManaged();
      await loadReferenceTopics();
    } catch (e) {
      setTopicsError("toggleTopicActive failed: " + e.message);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function topicDisplayName(tid) {
    const t = allTopics.find(t => t.topic_id === tid);
    return t ? t.topic_display_name : "Topic " + tid;
  }

  return {
    // State
    allTopics, setAllTopics,
    allTopicsManaged, setAllTopicsManaged, setAllTopicsManaged,
    topicsLoading, topicsError, setTopicsError,
    addTopicOpen, setAddTopicOpen,
    addTopicPrefill, setAddTopicPrefill,
    newTopic, setNewTopic,
    newTopicAdjacent, setNewTopicAdjacent,
    suggestingAdjacent, setSuggestingAdjacent,
    suggestingDescription, setSuggestingDescription,
    adjacentSuggested, setAdjacentSuggested,
    editingTopic, setEditingTopic,
    editTopicData, setEditTopicData,
    editTopicAdjacent, setEditTopicAdjacent,
    editSuggestingAdjacent, setEditSuggestingAdjacent,
    editSuggestingDescription, setEditSuggestingDescription,
    // Functions
    loadReferenceTopics, loadAllTopicsManaged,
    suggestTopicDescriptionAndDomain, suggestAdjacentTopics, suggestTopicAll,
    addTopic, saveTopicEdit, toggleTopicActive,
    topicDisplayName, slugify,
  };
}
