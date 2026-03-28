// Constants for the Devotional Ingestion Tool

export const DOMAINS = [
  { slug: "galilean-ministry", label: "Galilean Ministry" },
  { slug: "nativity-and-infancy", label: "Nativity & Infancy" },
  { slug: "teaching-and-ethics", label: "Teaching & Ethics" },
  { slug: "passion-narrative", label: "Passion Narrative" },
  { slug: "resurrection", label: "Resurrection" },
  { slug: "early-church", label: "Early Church" },
  { slug: "pauline-theology", label: "Pauline Theology" },
  { slug: "johannine-material", label: "Johannine Material" },
  { slug: "parables", label: "Parables" },
  { slug: "second-temple-judaism", label: "Second Temple Judaism" },
  { slug: "old-testament-backgrounds", label: "Old Testament Backgrounds" },
  { slug: "prayer-practices", label: "Prayer Practices" },
  { slug: "lament-tradition", label: "Lament Tradition" },
  { slug: "psalms-and-lament", label: "Psalms & Lament" },
  { slug: "theology-and-doctrine", label: "Theology & Doctrine" },
  { slug: "women-and-gender", label: "Women & Gender" },
  { slug: "social-and-political-context", label: "Social & Political Context" },
  { slug: "gospel-studies", label: "Gospel Studies" },
  { slug: "historical-jesus-method", label: "Historical Jesus Method" },
  { slug: "apocalyptic-and-later-nt", label: "Apocalyptic & Later NT" },
];

export const STRAND_COLOURS = {
  critical: { bg: "#DBEAFE", text: "#1E40AF" },
  evangelical: { bg: "#DCFCE7", text: "#166534" },
  catholic: { bg: "#EDE9FE", text: "#5B21B6" },
  feminist: { bg: "#FCE7F3", text: "#9D174D" },
  "social-prophet": { bg: "#FFEDD5", text: "#9A3412" },
  patristic: { bg: "#FEF3C7", text: "#92400E" },
  jewish: { bg: "#FFF7ED", text: "#9A3412" },
  orthodox: { bg: "#F0FDF4", text: "#14532D" },
  liberation: { bg: "#FDF4FF", text: "#6B21A8" },
  other: { bg: "#F3F4F6", text: "#374151" },
};

export const TIER_COLOURS = {
  foundational: { bg: "#DBEAFE", text: "#1E40AF" },
  established: { bg: "#DCFCE7", text: "#166534" },
  emerging: { bg: "#FEF3C7", text: "#92400E" },
  contested: { bg: "#FEE2E2", text: "#991B1B" },
};

export const TIER_OPTIONS = ["foundational", "established", "emerging", "contested"];

export const CONTESTED_AREA_OPTIONS = [
  { value: "historical-method", label: "Historical Method" },
  { value: "theological-conclusions", label: "Theological Conclusions" },
  { value: "textual-criticism", label: "Textual Criticism" },
  { value: "early-church-history", label: "Early Church History" },
  { value: "gender-and-authorship", label: "Gender & Authorship" },
];

export const SOURCE_TYPES = [
  { value: "primary-text", label: "Primary Text" },
  { value: "pdf-lecture-notes", label: "PDF / Lecture Notes" },
  { value: "personal-notes", label: "Personal Notes" },
  { value: "transcript", label: "Transcript" },
  { value: "secondary-source", label: "Secondary Source" },
  { value: "deep-research", label: "Claude Deep Research" },
];

const HISTORICAL_FULL_NAMES = [
  "ignatius of antioch","eusebius of caesarea","tertullian","irenaeus of lyon",
  "irenaeus","origen","clement of alexandria","clement of rome","cyprian",
  "augustine of hippo","thomas aquinas","john chrysostom","athanasius",
  "jerome","ambrose","basil of caesarea","basil the great","marcion",
  "polycarp","papias","justin martyr","hippolytus","lactantius",
  "walter bauer","martin luther","john calvin","john wesley",
];

const HISTORICAL_KEYWORDS = [
  "of antioch","of caesarea","of alexandria","of rome","of hippo","of lyon",
  "martyr","the great","antiquity","ancient","medieval","patristic",
];

export function guessEraFromName(name) {
  const lower = name.toLowerCase().trim();
  if (HISTORICAL_FULL_NAMES.some(n => lower === n || lower.startsWith(n))) return "historical";
  if (HISTORICAL_KEYWORDS.some(k => lower.includes(k))) return "historical";
  return "contemporary";
}

const PATRISTIC_FULL_NAMES = [
  "ignatius","eusebius","tertullian","irenaeus","origen","clement",
  "cyprian","augustine","chrysostom","athanasius","jerome","ambrose",
  "basil","marcion","polycarp","papias","justin martyr","hippolytus","lactantius",
];
const JEWISH_NAMES = [
  "levine","amy-jill","fredriksen","neusner","vermes","sanders","segal",
  "boyarin","scholem","heschel","soloveitchik","flusser","klausner",
  "zenger","jacobson",
];
const ORTHODOX_NAMES = [
  "ware","kallistos","schmemann","meyendorff","lossky","florovsky",
  "staniloae","breck","louth",
];
const LIBERATION_NAMES = [
  "gutierrez","sobrino","boff","segundo","cone","elizondo","isasi-diaz",
  "tamez","pixley","mesters",
];

export function guessStrandFromName(name) {
  const lower = name.toLowerCase().trim();
  if (PATRISTIC_FULL_NAMES.some(k => lower.includes(k))) return "patristic";
  if (JEWISH_NAMES.some(k => lower.includes(k))) return "jewish";
  if (ORTHODOX_NAMES.some(k => lower.includes(k))) return "orthodox";
  if (LIBERATION_NAMES.some(k => lower.includes(k))) return "liberation";
  return "other";
}
