import {
  type ApplicationInformation,
  AppWrapperRoute,
  defineWebApplication,
  useClientService,
  useUserStore,
} from '@opencloud-eu/web-pkg';
import {useGettext} from 'vue3-gettext';
import App from './App.vue';
import {ocContext} from './ocContext';

const appId = 'texlyre';

export default defineWebApplication({
  setup() {
    const {$gettext} = useGettext();
    const routeName = 'texlyre-file';

    try {
      // TeXlyre works on the whole folder of the opened document (includes,
      // images, bibliography), so it gets WebDAV access to that folder.
      const {webdav} = useClientService();
      ocContext.list = async (space, path) => {
        const {children = []} = await webdav.listFiles(space, {path}, {depth: 1});
        return children.map((child) => ({
          name: child.name,
          isDirectory: child.isFolder === true || child.type === 'folder',
          size: Number(child.size) || 0,
          lastModified: Date.parse(child.mdate ?? '') || 0,
          etag: child.etag,
        }));
      };
      ocContext.read = async (space, path) => {
        const response = await webdav.getFileContents(
          space,
          {path},
          {responseType: 'arraybuffer', noCache: true},
        );
        return response.body as ArrayBuffer;
      };
      ocContext.write = async (space, path, data) => {
        await webdav.putFileContents(space, {path, content: data, overwrite: true});
      };
      ocContext.mkdir = async (space, path) => {
        await webdav.createFolder(space, {path});
      };
      ocContext.remove = async (space, path) => {
        await webdav.deleteFile(space, {path});
      };
    } catch (err) {
      console.error('texlyre: OpenCloud WebDAV not available', err);
    }

    try {
      const userStore = useUserStore();
      ocContext.user = () => ({
        id: userStore.user?.id ?? 'anonymous',
        name: userStore.user?.onPremisesSamAccountName || userStore.user?.displayName || 'anonymous',
      });
    } catch {
      ocContext.user = undefined;
    }

    const routes = [
      {
        path: '/:driveAliasAndItem(.*)?',
        name: routeName,
        component: AppWrapperRoute(App, {
          applicationId: appId,
          fileContentOptions: {
            responseType: 'text',
          },
        }),
        meta: {
          authContext: 'hybrid',
          title: $gettext('TeXlyre'),
          patchCleanPath: true,
        },
      },
    ];

    const appInfo: ApplicationInformation = {
      id: appId,
      name: $gettext('TeXlyre'),
      icon: 'quill-pen',
      color: '#3b6ea5',
      extensions: [
        {
          // No hasPriority: the typst-editor stays the default for .typ;
          // TeXlyre is an additional "Open with" entry.
          extension: 'typ',
          routeName,
          label: () => $gettext('Mit TeXlyre öffnen'),
        },
      ],
    };

    return {
      appInfo,
      routes,
    };
  },
});
