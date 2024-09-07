import SettingsSidebarContent from '../_components/settings-sidebar';
import UserProfilePage from '../user/profile/_index';
import { useIsMobile } from '@/hooks/use-is-mobile';

export default function Page() {
  const isMobile = useIsMobile();
  return (
    <div className="flex h-full w-full flex-col items-start justify-start">
      {isMobile ? <SettingsSidebarContent /> : <UserProfilePage />}
    </div>
  );
}
