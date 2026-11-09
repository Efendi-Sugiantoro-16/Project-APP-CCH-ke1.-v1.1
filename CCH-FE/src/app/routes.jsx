import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from './layouts/AppShell.jsx'
import { AuthLayout } from './layouts/AuthLayout.jsx'
import { RequireAuth } from './guards/RequireAuth.jsx'
import LoginPage from '../features/auth/pages/LoginPage.jsx'
import DevAuthLoginPage from '../features/auth/pages/DevAuthLoginPage.jsx'
import LandingPage from '../features/home/pages/LandingPage.jsx'
import GuestIntakePage from '../features/intake/submission/pages/GuestIntakePage.jsx'
import IntakeResultPage from '../features/intake/submission/pages/IntakeResultPage.jsx'
import ReviewQueuePage from '../features/intake/review/pages/ReviewQueuePage.jsx'
import ReviewDraftPage from '../features/intake/review/pages/ReviewDraftPage.jsx'
import { WorkspaceLayout } from '../features/workspace/WorkspaceLayout.jsx'
import { WorkspaceDashboard } from '../features/complaints/pages/WorkspaceDashboard.jsx'
import {
  OpenComplaintsPage,
  CompletedComplaintsPage,
  ReceivedOpenComplaintsPage,
  SentOpenComplaintsPage,
} from '../features/complaints/pages/ComplaintListPages.jsx'
import { ComplaintDetailPage } from '../features/complaints/pages/ComplaintDetailPage.jsx'
import { StatusListPage } from '../features/complaints/pages/StatusListPage.jsx'
import { CreateComplaintPage } from '../features/complaints/pages/CreateComplaintPage.jsx'
import { FollowUpsWorkspacePage } from '../features/followups/pages/FollowUpsWorkspacePage.jsx'
import {
  OfficeFollowUpsPage,
  DueTodayFollowUpsPage,
} from '../features/followups/pages/FollowUpPages.jsx'
import { UserLevelsPage } from '../features/admin/pages/UserLevelsPage.jsx'
import { UsersManagementPage } from '../features/admin/pages/UsersManagementPage.jsx'
import { MasterDataStudioPage } from '../features/admin/pages/MasterDataStudioPage.jsx'
import { GagalXrayPage } from '../features/gagalxray/pages/GagalXrayPage.jsx'
import { ReceivedUnrespondedPage } from '../features/reports/pages/ReceivedUnrespondedPage.jsx'
import { SentUnrespondedPage } from '../features/reports/pages/SentUnrespondedPage.jsx'
import { BreakdownReportPage } from '../features/reports/pages/BreakdownReportPage.jsx'
import { DurationReportPage } from '../features/reports/pages/DurationReportPage.jsx'
import { OfficeSummaryReportPage } from '../features/reports/pages/OfficeSummaryReportPage.jsx'
import { VisitorStatisticsPage } from '../features/stats/pages/VisitorStatisticsPage.jsx'
import { SentimentAnalyticsPage } from '../features/stats/pages/SentimentAnalyticsPage.jsx'
import { SocialMonitoringPage } from '../features/ai/pages/SocialMonitoringPage.jsx'
import { UserProfilePage } from '../features/workspace/UserProfilePage.jsx'

export const AppRoutes = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    // Auth routes - standalone without header/footer
    path: '/',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'dev-login', element: <DevAuthLoginPage /> },
    ],
  },
  {
    // Public routes with AppShell (header + footer)
    path: '/',
    element: <AppShell />,
    children: [
      { path: 'intake', element: <GuestIntakePage /> },
      { path: 'intake/result', element: <IntakeResultPage /> },
      {
        path: 'review',
        element: (
          <RequireAuth>
            <ReviewQueuePage />
          </RequireAuth>
        ),
      },
      {
        path: 'review/drafts/:id',
        element: (
          <RequireAuth>
            <ReviewDraftPage />
          </RequireAuth>
        ),
      },
    ],
  },
  {
    // Dedicated workspace shell: dark sidebar + topbar, nested pages.
    path: '/workspace',
    element: (
      <RequireAuth>
        <WorkspaceLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <WorkspaceDashboard /> },
      { path: 'follow-ups', element: <FollowUpsWorkspacePage /> },
      { path: 'follow-ups/all', element: <OfficeFollowUpsPage /> },
      { path: 'follow-ups/due-today', element: <DueTodayFollowUpsPage /> },
      { path: 'complaints/create', element: <CreateComplaintPage /> },
      { path: 'complaints/open', element: <OpenComplaintsPage /> },
      { path: 'complaints/completed', element: <CompletedComplaintsPage /> },
      { path: 'complaints/received-open', element: <ReceivedOpenComplaintsPage /> },
      { path: 'complaints/sent-open', element: <SentOpenComplaintsPage /> },
      { path: 'complaints/status-list', element: <StatusListPage /> },
      { path: 'complaints/open/:id', element: <ComplaintDetailPage /> },
      { path: 'complaints/completed/:id', element: <ComplaintDetailPage completed /> },
      { path: 'reports/received-unresponded', element: <ReceivedUnrespondedPage /> },
      { path: 'reports/sent-unresponded', element: <SentUnrespondedPage /> },
      { path: 'reports/breakdown', element: <BreakdownReportPage /> },
      { path: 'reports/duration', element: <DurationReportPage /> },
      { path: 'reports/office-summary', element: <OfficeSummaryReportPage /> },
      { path: 'gagal-xray', element: <GagalXrayPage /> },
      { path: 'stats/visitors', element: <VisitorStatisticsPage /> },
      { path: 'analytics/sentiment', element: <SentimentAnalyticsPage /> },
      { path: 'ai/social-monitoring', element: <SocialMonitoringPage /> },
      { path: 'profile', element: <UserProfilePage /> },
      { path: 'admin/masters', element: <MasterDataStudioPage /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <WorkspaceLayout />
      </RequireAuth>
    ),
    children: [
      { path: 'users', element: <UsersManagementPage /> },
      { path: 'user-levels', element: <UserLevelsPage /> },
      { path: 'masters', element: <MasterDataStudioPage /> },
      { path: 'stats/visitors', element: <VisitorStatisticsPage /> },
      { path: 'analytics/sentiment', element: <SentimentAnalyticsPage /> },
      { path: 'ai/social-monitoring', element: <SocialMonitoringPage /> },
    ],
  },
])
