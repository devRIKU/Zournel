import fs from 'fs';
import path from 'path';

const files = [
  'App.tsx',
  'components/AutoBackupPill.tsx',
  'components/JournalView.tsx',
  'components/SettingsModal.tsx',
  'components/ProjectsModal.tsx',
  'components/OnboardingModal.tsx',
  'components/ProfileView.tsx',
  'components/LandingPage.tsx',
  'components/ImportModal.tsx',
  'components/AddModal.tsx',
  'components/AiGlitterTypewriter.tsx',
  'components/TodoView.tsx',
  'components/AiChatbotModal.tsx',
  'components/JournalEditor.tsx',
  'components/BottomNav.tsx',
  'components/ContactsModal.tsx',
  'components/BlogView.tsx',
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  if (file === 'App.tsx') {
    content = content.replace(/from 'lucide-react'/g, "from './components/Icons'");
  } else {
    content = content.replace(/from 'lucide-react'/g, "from './Icons'");
  }
  
  fs.writeFileSync(file, content);
}
