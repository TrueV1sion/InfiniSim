import React from 'react';
import { ModelTier, HistoryItem, Bookmark, BrowserEra, DeviceType, NavigationState, BrowserConfig, PanelState, UserState } from '../types';
import NavigationControls from './navbar/NavigationControls';
import UrlInput from './navbar/UrlInput';
import ModelSwitcher from './navbar/ModelSwitcher';
import UserMenu from './navbar/UserMenu';
import ToolbarToggles from './navbar/ToolbarToggles';
import DeviceSelector from './navbar/DeviceSelector';
import EraSelector from './navbar/EraSelector';
import ActionButtons from './navbar/ActionButtons';

interface AddressBarProps {
  nav: NavigationState;
  config: BrowserConfig;
  panels: PanelState;
  userState: UserState;
  history: HistoryItem[];
  bookmarks: Bookmark[];
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onStop: () => void;
  onHome: () => void;
  onDownload: () => void;
  onSetModel: (model: ModelTier) => void;
  onSetDeviceType: (deviceType: DeviceType) => void;
  onSetBrowserEra: (browserEra: BrowserEra) => void;
  onToggleHistory: () => void;
  onToggleDevTools: () => void;
  onToggleBookmark: () => void;
  onToggleDeepResearch: () => void;
  onToggleSound: () => void;
  onToggleDownloads: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onPublish: () => void;
}

const AddressBar: React.FC<AddressBarProps> = ({
  nav,
  config,
  panels,
  userState,
  history,
  bookmarks,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onStop,
  onHome,
  onDownload,
  onSetModel,
  onSetDeviceType,
  onSetBrowserEra,
  onToggleHistory,
  onToggleDevTools,
  onToggleBookmark,
  onToggleDeepResearch,
  onToggleSound,
  onToggleDownloads,
  onLogin,
  onLogout,
  onPublish,
}) => {
  return (
    <div className="bg-[#0a0a0a] border-b border-white/5 text-white sticky top-0 z-50 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2 px-3 py-2">
        <NavigationControls
          canGoBack={nav.canGoBack}
          canGoForward={nav.canGoForward}
          isLoading={nav.isLoading}
          currentUrl={nav.currentUrl}
          onBack={onBack}
          onForward={onForward}
          onReload={onReload}
          onStop={onStop}
          onHome={onHome}
        />

        <UrlInput
          currentUrl={nav.currentUrl}
          isBookmarked={panels.isBookmarked}
          canPublish={userState.canPublish}
          history={history}
          bookmarks={bookmarks}
          onNavigate={onNavigate}
          onToggleBookmark={onToggleBookmark}
          onPublish={onPublish}
        />

        <ModelSwitcher model={config.model} onSetModel={onSetModel} />
        <UserMenu user={userState.user} onLogin={onLogin} onLogout={onLogout} />
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-1 border-t border-white/[0.03] bg-[#080808]">
        <ToolbarToggles
          isDeepResearch={config.isDeepResearch}
          isSoundEnabled={config.isSoundEnabled}
          onToggleDeepResearch={onToggleDeepResearch}
          onToggleSound={onToggleSound}
        />

        <div className="flex items-center gap-2">
          <DeviceSelector deviceType={config.deviceType} onSetDeviceType={onSetDeviceType} />
          <EraSelector browserEra={config.browserEra} onSetBrowserEra={onSetBrowserEra} />
        </div>

        <ActionButtons
          canDownload={userState.canDownload}
          isDevToolsOpen={panels.isDevToolsOpen}
          isDownloadsOpen={panels.isDownloadsOpen}
          onNavigate={onNavigate}
          onDownload={onDownload}
          onToggleDownloads={onToggleDownloads}
          onToggleDevTools={onToggleDevTools}
          onToggleHistory={onToggleHistory}
        />
      </div>

      {nav.isLoading && (
        <div className="h-0.5 bg-transparent overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-500 animate-[loading-slide_1.5s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
        </div>
      )}
    </div>
  );
};

export default AddressBar;
