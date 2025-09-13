'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ---- OPTIONAL: ilk dili URL/cookie’den çekmek için ufak yardımcılar
function getLangFromPath() {
  if (typeof window === 'undefined') return null;
  const seg = window.location.pathname.split('/')[1];
  return ['en', 'tr'].includes(seg) ? seg : null;
}
function getLangFromCookie() {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
function getInitialLng() {
  // Öncelik: cookie → path → fallback
  return getLangFromCookie() || getLangFromPath() || 'en';
}

// ---- RESOURCES
import enNotFound from '@/locales/en/notFound.json';
import trNotFound from '@/locales/tr/notFound.json';

import enMetadata from '@/locales/en/metadata/metadata.json';
import trMetadata from '@/locales/tr/metadata/metadata.json';

import enHeader from '@/locales/en/home/main/header.json';
import trHeader from '@/locales/tr/home/main/header.json';

import enHero from '@/locales/en/home/main/hero.json';
import trHero from '@/locales/tr/home/main/hero.json';

import enAbout from '@/locales/en/home/main/about.json';
import trAbout from '@/locales/tr/home/main/about.json';

import enFuature from '@/locales/en/home/main/featuresTabs.json';
import trFuature from '@/locales/tr/home/main/featuresTabs.json';

import enFooter from '@/locales/en/home/main/footer.json';
import trFooter from '@/locales/tr/home/main/footer.json';

import enLogin from '@/locales/en/auth/login.json';
import trLogin from '@/locales/tr/auth/login.json';

import enRegister from '@/locales/en/auth/register.json';
import trRegister from '@/locales/tr/auth/register.json';

import enLeftMenu from '@/locales/en/profile/leftMenu.json';
import trLeftMenu from '@/locales/tr/profile/leftMenu.json';

import enIndicator from '@/locales/en/strategies/indicator.json';
import trIndicator from '@/locales/tr/strategies/indicator.json';

import enProfileHeader from '@/locales/en/profile/header.json';
import trProfileHeader from '@/locales/tr/profile/header.json';

import enPortfolio from '@/locales/en/profile/portfolio.json';
import trPortfolio from '@/locales/tr/profile/portfolio.json';

import enPortfolioChart from '@/locales/en/profile/portfolioChart.json';
import trPortfolioChart from '@/locales/tr/profile/portfolioChart.json';

import enRightBar from '@/locales/en/profile/rightBar.json';
import trRightBar from '@/locales/tr/profile/rightBar.json';

import enBotsList from '@/locales/en/profile/botsList.json';
import trBotsList from '@/locales/tr/profile/botsList.json';

import enExamineBot from '@/locales/en/profile/examineBot.json';
import trExamineBot from '@/locales/tr/profile/examineBot.json';

import enBotPieChart from '@/locales/en/profile/botPieChart.json';
import trBotPieChart from '@/locales/tr/profile/botPieChart.json';

import enStrategyIndicator from '@/locales/en/profile/strategyIndicator.json';
import trStrategyIndicator from '@/locales/tr/profile/strategyIndicator.json';

import enPublishStrategyModal from '@/locales/en/profile/publishStrategyModal.json';
import trPublishStrategyModal from '@/locales/tr/profile/publishStrategyModal.json';

import enPublishIndicatorModal from '@/locales/en/profile/publishIndicatorModal.json';
import trPublishIndicatorModal from '@/locales/tr/profile/publishIndicatorModal.json';

import enSettings from '@/locales/en/app/settings.json';
import trSettings from '@/locales/tr/app/settings.json';

import enPersonalIndicators from '@/locales/en/strategies/personalIndicators.json';
import trPersonalIndicators from '@/locales/tr/strategies/personalIndicators.json';

import enAddStrategyButton from '@/locales/en/strategies/addStrategyButton.json';
import trAddStrategyButton from '@/locales/tr/strategies/addStrategyButton.json';

import enPersonalStrategies from '@/locales/en/strategies/personalStrategies.json';
import trPersonalStrategies from '@/locales/tr/strategies/personalStrategies.json';

import enIndicatorEditor from '@/locales/en/strategies/indicatorCodePanel.json';
import trIndicatorEditor from '@/locales/tr/strategies/indicatorCodePanel.json';

import enIndicatorTerminal from '@/locales/en/strategies/indicatorTerminal.json';
import trIndicatorTerminal from '@/locales/tr/strategies/indicatorTerminal.json';

import enStrategyCodePanel from '@/locales/en/strategies/strategyCodePanel.json';
import trStrategyCodePanel from '@/locales/tr/strategies/strategyCodePanel.json';

import enStrategyTerminal from '@/locales/en/strategies/strategyTerminal.json';
import trStrategyTerminal from '@/locales/tr/strategies/strategyTerminal.json';

import enStrategiesHeader from '@/locales/en/strategies/header.json';
import trStrategiesHeader from '@/locales/tr/strategies/header.json';

import enRuler from '@/locales/en/strategies/ruler.json';
import trRuler from '@/locales/tr/strategies/ruler.json';

import enBacktestHeader from '@/locales/en/backtest/header.json';
import trBacktestHeader from '@/locales/tr/backtest/header.json';

import enBacktestStrategyButton from '@/locales/en/backtest/strategyButton.json';
import trBacktestStrategyButton from '@/locales/tr/backtest/strategyButton.json';

import enBacktestTechnicalStrategies from '@/locales/en/backtest/technicalStrategies.json';
import trBacktestTechnicalStrategies from '@/locales/tr/backtest/technicalStrategies.json';

import enBacktestPersonalStrategies from '@/locales/en/backtest/personalStrategies.json';
import trBacktestPersonalStrategies from '@/locales/tr/backtest/personalStrategies.json';

import enBacktestCommunityStrategies from '@/locales/en/backtest/communityStrategies.json';
import trBacktestCommunityStrategies from '@/locales/tr/backtest/communityStrategies.json';

import enBacktestCryptoSelectButton from '@/locales/en/backtest/cryptoSelectButton.json';
import trBacktestCryptoSelectButton from '@/locales/tr/backtest/cryptoSelectButton.json';

import enBacktestPage from '@/locales/en/backtest/page.json';
import trBacktestPage from '@/locales/tr/backtest/page.json';

import enBacktestArchivedBacktest from '@/locales/en/backtest/archivedBacktest.json';
import trBacktestArchivedBacktest from '@/locales/tr/backtest/archivedBacktest.json';

import enBacktestInfoCard from '@/locales/en/backtest/infoCard.json';
import trBacktestInfoCard from '@/locales/tr/backtest/infoCard.json';

import enBacktestChart from '@/locales/en/backtest/chart.json';
import trBacktestChart from '@/locales/tr/backtest/chart.json';

import enBacktestPerformanceMetrics from '@/locales/en/backtest/performanceMetrics.json';
import trBacktestPerformanceMetrics from '@/locales/tr/backtest/performanceMetrics.json';

import enBacktestTradesList from '@/locales/en/backtest/tradesList.json';
import trBacktestTradesList from '@/locales/tr/backtest/tradesList.json';

import enBotPage from '@/locales/en/bot/page.json';
import trBotPage from '@/locales/tr/bot/page.json';

import enBotModal from '@/locales/en/bot/botModal.json';
import trBotModal from '@/locales/tr/bot/botModal.json';

import enBotChooseStrategy from '@/locales/en/bot/chooseStrategy.json';
import trBotChooseStrategy from '@/locales/tr/bot/chooseStrategy.json';

import enBotCard from '@/locales/en/bot/botCard.json';
import trBotCard from '@/locales/tr/bot/botCard.json';

import enDeleteConfirm from '@/locales/en/bot/deleteConfirm.json';
import trDeleteConfirm from '@/locales/tr/bot/deleteConfirm.json';

import enShutDown from '@/locales/en/bot/shutDown.json';
import trShutDown from '@/locales/tr/bot/shutDown.json';

import enCriticalConfirmModal from '@/locales/en/bot/criticalConfirmModal.json';
import trCriticalConfirmModal from '@/locales/tr/bot/criticalConfirmModal.json';

import enTechnicalStrategies from '@/locales/en/bot/technicalStrategies.json';
import trTechnicalStrategies from '@/locales/tr/bot/technicalStrategies.json';

import enBotPersonalStrategies from '@/locales/en/bot/personalStrategies.json';
import trBotPersonalStrategies from '@/locales/tr/bot/personalStrategies.json';

import enCommunityStrategies from '@/locales/en/bot/communityStrategies.json';
import trCommunityStrategies from '@/locales/tr/bot/communityStrategies.json';

import enshowcaseHeader from '@/locales/en/showcase/header.json';
import trshowcaseHeader from '@/locales/tr/showcase/header.json';

import enShowcaseSearchButton from '@/locales/en/showcase/searchButton.json';
import trShowcaseSearchButton from '@/locales/tr/showcase/searchButton.json';

import enShowcaseSellRentModal from '@/locales/en/showcase/sellRentModal.json';
import trShowcaseSellRentModal from '@/locales/tr/showcase/sellRentModal.json';

import enShowcaseChooseBotModal from '@/locales/en/showcase/chooseBotModal.json';
import trShowcaseChooseBotModal from '@/locales/tr/showcase/chooseBotModal.json';

import enBotFilterSidebar from '@/locales/en/showcase/botFilterSidebar.json';
import trBotFilterSidebar from '@/locales/tr/showcase/botFilterSidebar.json';

import enBotDiscoveryApp from '@/locales/en/showcase/botDiscoveryApp.json';
import trBotDiscoveryApp from '@/locales/tr/showcase/botDiscoveryApp.json';

import enShowcaseBotCard from '@/locales/en/showcase/botCard.json';
import trShowcaseBotCard from '@/locales/tr/showcase/botCard.json';

import enBuyModal from '@/locales/en/showcase/buyModal.json';
import trBuyModal from '@/locales/tr/showcase/buyModal.json';

import enRentModal from '@/locales/en/showcase/rentModal.json';
import trRentModal from '@/locales/tr/showcase/rentModal.json';

import enUserProfileCard from '@/locales/en/showcase/userProfileCard.json';
import trUserProfileCard from '@/locales/tr/showcase/userProfileCard.json';

import enBotterGuide from '@/locales/en/showcase/botterGuide.json';
import trBotterGuide from '@/locales/tr/showcase/botterGuide.json';

import enTrades from '@/locales/en/showcase/trades.json';
import trTrades from '@/locales/tr/showcase/trades.json';

import enSideBar from '@/locales/en/showcase/sideBar.json';
import trSideBar from '@/locales/tr/showcase/sideBar.json';

import enUserLeaderBoard from '@/locales/en/showcase/userLeaderBoard.json';
import trUserLeaderBoard from '@/locales/tr/showcase/userLeaderBoard.json';

import enBotLeaderBoard from '@/locales/en/showcase/botLeaderBoard.json';
import trBotLeaderBoard from '@/locales/tr/showcase/botLeaderBoard.json';

import enApiContent from '@/locales/en/api/apiContent.json';
import trApiContent from '@/locales/tr/api/apiContent.json';

import enAddApi from '@/locales/en/api/addApi.json';
import trAddApi from '@/locales/tr/api/addApi.json';

import enConfirmDelete from '@/locales/en/api/confirmDelete.json';
import trConfirmDelete from '@/locales/tr/api/confirmDelete.json';

import enStrategiesSettings from '@/locales/en/strategies/strategiesSettings.json';
import trStrategiesSettings from '@/locales/tr/strategies/strategiesSettings.json';


if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      lng: getInitialLng(),
      fallbackLng: 'en',
      supportedLngs: ['en', 'tr'],

      resources: {
        en: {
          notFound: enNotFound, metadata: enMetadata, header: enHeader, hero: enHero, about: enAbout, feature: enFuature, footer: enFooter, login: enLogin, register: enRegister, leftmenu: enLeftMenu, indicator: enIndicator, profileHeader: enProfileHeader, portfolio: enPortfolio, portfolioChart: enPortfolioChart, rightBar: enRightBar, botsList: enBotsList, examineBot: enExamineBot, botPieChart: enBotPieChart, strategyIndicator: enStrategyIndicator, publishStrategyModal: enPublishStrategyModal, publishIndicatorModal: enPublishIndicatorModal, settings: enSettings, personalIndicators: enPersonalIndicators, addStrategyButton: enAddStrategyButton, personalStrategies: enPersonalStrategies, indicatorEditor: enIndicatorEditor, indicatorTerminal: enIndicatorTerminal, strategyCodePanel: enStrategyCodePanel, strategyTerminal: enStrategyTerminal, strategiesHeader: enStrategiesHeader, ruler: enRuler, backtestHeader: enBacktestHeader, backtestStrategyButton: enBacktestStrategyButton, backtestTechnicalStrategies: enBacktestTechnicalStrategies, backtestPersonalStrategies: enBacktestPersonalStrategies, backtestCommunityStrategies: enBacktestCommunityStrategies, backtestCryptoSelectButton: enBacktestCryptoSelectButton, backtestPage: enBacktestPage, backtestArchivedBacktest: enBacktestArchivedBacktest, backtestInfoCard: enBacktestInfoCard,
          backtestChart: enBacktestChart, backtestPerformanceMetrics: enBacktestPerformanceMetrics, backtestTradesList: enBacktestTradesList, botPage: enBotPage, botModal: enBotModal, botChooseStrategy: enBotChooseStrategy, botCard: enBotCard, deleteConfirm: enDeleteConfirm, shutDown: enShutDown, criticalConfirmModal: enCriticalConfirmModal, technicalStrategies: enTechnicalStrategies, botPersonalStrategies: enBotPersonalStrategies, communityStrategies: enCommunityStrategies, showcaseHeader: enshowcaseHeader,
          searchButton: enShowcaseSearchButton, sellRentModal: enShowcaseSellRentModal, chooseBotModal: enShowcaseChooseBotModal, botFilterSidebar: enBotFilterSidebar, botDiscoveryApp: enBotDiscoveryApp, showcaseBotCard: enShowcaseBotCard, buyModal: enBuyModal, rentModal: enRentModal, userProfileCard: enUserProfileCard, botterGuide: enBotterGuide, trades: enTrades, sideBar: enSideBar, userLeaderBoard: enUserLeaderBoard, botLeaderBoard: enBotLeaderBoard, apiContent: enApiContent, addApi: enAddApi, confirmDelete: enConfirmDelete, strategiesSettings: enStrategiesSettings
        },
        tr: {
          notFound: trNotFound, metadata: trMetadata, header: trHeader, hero: trHero, about: trAbout, feature: trFuature, footer: trFooter, login: trLogin, register: trRegister, leftmenu: trLeftMenu, indicator: trIndicator, profileHeader: trProfileHeader, portfolio: trPortfolio, portfolioChart: trPortfolioChart, rightBar: trRightBar, botsList: trBotsList, examineBot: trExamineBot, botPieChart: trBotPieChart, strategyIndicator: trStrategyIndicator, publishStrategyModal: trPublishStrategyModal, publishIndicatorModal: trPublishIndicatorModal, settings: trSettings, personalIndicators: trPersonalIndicators, addStrategyButton: trAddStrategyButton, personalStrategies: trPersonalStrategies, indicatorEditor: trIndicatorEditor, indicatorTerminal: trIndicatorTerminal, strategyCodePanel: trStrategyCodePanel, strategyTerminal: trStrategyTerminal, strategiesHeader: trStrategiesHeader, ruler: trRuler, backtestHeader: trBacktestHeader, backtestStrategyButton: trBacktestStrategyButton, backtestTechnicalStrategies: trBacktestTechnicalStrategies, backtestPersonalStrategies: trBacktestPersonalStrategies, backtestCommunityStrategies: trBacktestCommunityStrategies, backtestCryptoSelectButton: trBacktestCryptoSelectButton, backtestPage: trBacktestPage, backtestArchivedBacktest: trBacktestArchivedBacktest, backtestInfoCard: trBacktestInfoCard,
          backtestChart: trBacktestChart, backtestPerformanceMetrics: trBacktestPerformanceMetrics, backtestTradesList: trBacktestTradesList, botPage: trBotPage, botModal: trBotModal, botChooseStrategy: trBotChooseStrategy, botCard: trBotCard, deleteConfirm: trDeleteConfirm, shutDown: trShutDown, criticalConfirmModal: trCriticalConfirmModal, technicalStrategies: trTechnicalStrategies, botPersonalStrategies: trBotPersonalStrategies, communityStrategies: trCommunityStrategies, showcaseHeader: trshowcaseHeader,
          searchButton: trShowcaseSearchButton, sellRentModal: trShowcaseSellRentModal, chooseBotModal: trShowcaseChooseBotModal, botFilterSidebar: trBotFilterSidebar, botDiscoveryApp: trBotDiscoveryApp, showcaseBotCard: trShowcaseBotCard, buyModal: trBuyModal, rentModal: trRentModal, userProfileCard: trUserProfileCard, botterGuide: trBotterGuide, trades: trTrades, sideBar: trSideBar, userLeaderBoard: trUserLeaderBoard, botLeaderBoard: trBotLeaderBoard, apiContent: trApiContent, addApi: trAddApi, confirmDelete: trConfirmDelete, strategiesSettings: trStrategiesSettings
        },
      },

      // App’te explicit namespace kullanıyorsun, yine de liste dursun:
      ns: ['common','notFound','metadata','header','hero','about','feature','footer','login','leftmenu','profileHeader', 'portfolio', 'portfolioChart', 'strategyIndicator'],
      defaultNS: 'common',

      interpolation: { escapeValue: false },
      // react-i18next tarafında ihtiyaç duyarsan:
      // react: { useSuspense: false },
    });
}

export default i18n;
