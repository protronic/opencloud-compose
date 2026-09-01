import {
  type ApplicationInformation,
  AppWrapperRoute,
  defineWebApplication,
  useClientService,
} from '@opencloud-eu/web-pkg';
import {useGettext} from 'vue3-gettext';
import App from './App.vue';
import {ocContext} from './ocContext.ts';

const appId = 'flowberry';

export default defineWebApplication({
  setup() {
    const {$gettext} = useGettext();
    const routeName = 'flowberry-file';

    try {
      // Der Berry-Export schreibt das generierte .be neben die .flowberry-Datei.
      const clientService = useClientService();
      ocContext.saveSibling = async (space, path, content) => {
        await clientService.webdav.putFileContents(space, {path, content, overwrite: true});
      };
    } catch {
      ocContext.saveSibling = undefined;
    }

    const routes = [
      {
        name: routeName,
        path: '/:driveAliasAndItem(.*)?',
        component: AppWrapperRoute(App, {
          applicationId: appId,
        }),
        meta: {
          authContext: 'hybrid',
          patchCleanPath: true,
        },
      },
    ];

    const appInfo: ApplicationInformation = {
      name: $gettext('flowBerry'),
      id: appId,
      icon: 'flow-chart',
      color: '#4F7A5A',
      defaultExtension: 'flowberry',
      extensions: [
        {
          extension: 'flowberry',
          routeName,
          newFileMenu: {
            menuTitle() {
              return $gettext('flowBerry-Logik');
            },
          },
        },
      ],
    };

    return {
      appInfo,
      routes,
    };
  },
});
