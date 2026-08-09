const Phosphor = require('@phosphor-icons/react');
const icons = [
"Activity", "AlertCircle", "ArrowRight", "ArrowUpRight", "Bookmark", "BookOpen", "Bot", "Calendar", "Cat", "Check", "CheckCircle", "CheckCircle2", "ChevronDown", "ClipboardList", "Clock", "Cloud", "CloudCheck", "CloudDownload", "CloudUpload", "Code", "Code2", "Coffee", "Copy", "Cpu", "Database", "Edit3", "ExternalLink", "Feather", "FileJson", "FileText", "GitBranch", "Github", "Globe", "Grid", "Heart", "Image", "Instagram", "Key", "Library", "LineChart", "ListTodo", "Loader2", "Mail", "Moon", "Palette", "Pencil", "Plus", "PlusCircle", "RefreshCw", "Search", "Send", "Settings", "Share2", "ShieldCheck", "Smile", "Sparkles", "Star", "Sun", "Trash2", "TreePine", "TrendingUp", "Twitter", "Type", "Upload", "User", "UserCircle2", "Wand2", "X", "Youtube"
];
const missing = [];
for (const icon of icons) {
  if (!Phosphor[icon]) missing.push(icon);
}
console.log("Missing:", missing.join(', '));
