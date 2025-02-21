// #region Path Parameter Types
export interface RouteParamsTypes {
  workspace: {
    root: { workspaceId: string };
    all: { workspaceId: string };
    trash: { workspaceId: string };
    doc: {
      root: { workspaceId: string; docId: string };
      attachment: { workspaceId: string; docId: string; attachmentId: string };
    };
    journals: { workspaceId: string };
    collections: {
      root: { workspaceId: string };
      collection: { workspaceId: string; collectionId: string };
    };
    tags: {
      root: { workspaceId: string };
      tag: { workspaceId: string; tagId: string };
    };
  };
  share: { workspaceId: string; pageId: string };
  invite: { inviteId: string };
  payment: { plan: string };
  auth: { authType: string };
  openApp: { action: string };
}
// #endregion

// #region Absolute Paths
export const ABSOLUTE_PATHS = {
  root: '/',
  workspace: {
    root: '/workspaces/:workspaceId',
    all: '/workspaces/:workspaceId/all',
    trash: '/workspaces/:workspaceId/trash',
    doc: {
      root: '/workspaces/:workspaceId/docs/:docId',
      attachment:
        '/workspaces/:workspaceId/docs/:docId/attachment/:attachmentId',
    },
    journals: '/workspaces/:workspaceId/journals',
    collections: {
      root: '/workspaces/:workspaceId/collections',
      collection: '/workspaces/:workspaceId/collections/:collectionId',
    },
    tags: {
      root: '/workspaces/:workspaceId/tags',
      tag: '/workspaces/:workspaceId/tags/:tagId',
    },
  },
  share: '/share/:workspaceId/:pageId',
  expired: '/expired',
  invite: '/invite/:inviteId',
  payment: '/payment/:plan/success',
  onboarding: '/onboarding',
  redirect: '/redirect',
  subscribe: '/subscribe',
  upgradeToTeam: '/upgrade-to-team',
  tryCloud: '/try-cloud',
  themeEditor: '/theme-editor',
  template: {
    root: '/template',
    import: '/template/import',
    preview: '/template/preview',
  },
  auth: '/auth/:authType',
  signIn: '/sign-in',
  magicLink: '/magic-link',
  oauth: { root: '/oauth', login: '/oauth/login', callback: '/oauth/callback' },
  openApp: '/open-app/:action',
  notFound: '/404',
};
// #endregion

// #region Relative Paths
export const RELATIVE_PATHS = {
  root: '/',
  workspace: {
    root: 'workspaces/:workspaceId',
    all: 'all',
    trash: 'trash',
    doc: { root: 'docs/:docId', attachment: 'attachment/:attachmentId' },
    journals: 'journals',
    collections: { root: 'collections', collection: ':collectionId' },
    tags: { root: 'tags', tag: ':tagId' },
  },
  share: 'share/:workspaceId/:pageId',
  expired: 'expired',
  invite: 'invite/:inviteId',
  payment: 'payment/:plan/success',
  onboarding: 'onboarding',
  redirect: 'redirect',
  subscribe: 'subscribe',
  upgradeToTeam: 'upgrade-to-team',
  tryCloud: 'try-cloud',
  themeEditor: 'theme-editor',
  template: { root: 'template', import: 'import', preview: 'preview' },
  auth: 'auth/:authType',
  signIn: 'sign-in',
  magicLink: 'magic-link',
  oauth: { root: 'oauth', login: 'login', callback: 'callback' },
  openApp: 'open-app/:action',
  notFound: '404',
};
// #endregion

// #region Path Factories
const home = () => '/';
const workspace = (params: { workspaceId: string }) =>
  `/workspaces/${params.workspaceId}`;
workspace.all = (params: { workspaceId: string }) =>
  `/workspaces/${params.workspaceId}/all`;
workspace.trash = (params: { workspaceId: string }) =>
  `/workspaces/${params.workspaceId}/trash`;
const workspace_doc = (params: { workspaceId: string; docId: string }) =>
  `/workspaces/${params.workspaceId}/docs/${params.docId}`;
workspace_doc.attachment = (params: {
  workspaceId: string;
  docId: string;
  attachmentId: string;
}) =>
  `/workspaces/${params.workspaceId}/docs/${params.docId}/attachment/${params.attachmentId}`;
workspace.doc = workspace_doc;
workspace.journals = (params: { workspaceId: string }) =>
  `/workspaces/${params.workspaceId}/journals`;
const workspace_collections = (params: { workspaceId: string }) =>
  `/workspaces/${params.workspaceId}/collections`;
workspace_collections.collection = (params: {
  workspaceId: string;
  collectionId: string;
}) => `/workspaces/${params.workspaceId}/collections/${params.collectionId}`;
workspace.collections = workspace_collections;
const workspace_tags = (params: { workspaceId: string }) =>
  `/workspaces/${params.workspaceId}/tags`;
workspace_tags.tag = (params: { workspaceId: string; tagId: string }) =>
  `/workspaces/${params.workspaceId}/tags/${params.tagId}`;
workspace.tags = workspace_tags;
const share = (params: { workspaceId: string; pageId: string }) =>
  `/share/${params.workspaceId}/${params.pageId}`;
const expired = () => '/expired';
const invite = (params: { inviteId: string }) => `/invite/${params.inviteId}`;
const payment = (params: { plan: string }) => `/payment/${params.plan}/success`;
const onboarding = () => '/onboarding';
const redirect = () => '/redirect';
const subscribe = () => '/subscribe';
const upgradeToTeam = () => '/upgrade-to-team';
const tryCloud = () => '/try-cloud';
const themeEditor = () => '/theme-editor';
const template = () => '/template';
template.import = () => '/template/import';
template.preview = () => '/template/preview';
const auth = (params: { authType: string }) => `/auth/${params.authType}`;
const signIn = () => '/sign-in';
const magicLink = () => '/magic-link';
const oauth = () => '/oauth';
oauth.login = () => '/oauth/login';
oauth.callback = () => '/oauth/callback';
const openApp = (params: { action: string }) => `/open-app/${params.action}`;
const notFound = () => '/404';
export const PATH_FACTORIES = {
  workspace,
  share,
  expired,
  invite,
  payment,
  onboarding,
  redirect,
  subscribe,
  upgradeToTeam,
  tryCloud,
  themeEditor,
  template,
  auth,
  signIn,
  magicLink,
  oauth,
  openApp,
  notFound,
  home,
};
// #endregion
