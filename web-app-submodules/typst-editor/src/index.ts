import {
  type ApplicationInformation,
  AppWrapperRoute,
  defineWebApplication,
  useClientService,
} from '@opencloud-eu/web-pkg';
import {useGettext} from 'vue3-gettext';
import App from './App.vue';
import {ocContext} from './ocContext';

const appId = 'typst-editor';

export default defineWebApplication({
  setup() {
    const {$gettext} = useGettext();
    const routeName = 'typst-editor-file';

    try {
      // The PDF export writes the compiled document next to the .typ file.
      const clientService = useClientService();
      ocContext.savePdf = async (space, path, content) => {
        await clientService.webdav.putFileContents(space, {path, content, overwrite: true});
      };
    } catch {
      ocContext.savePdf = undefined;
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
          title: $gettext('Typst Editor'),
          patchCleanPath: true,
        },
      },
    ];

    const appInfo: ApplicationInformation = {
      id: appId,
      name: $gettext('Typst Editor'),
      icon: 'file-text',
      color: '#239dad',
      defaultExtension: 'typ',
      extensions: [
        {
          extension: 'typ',
          routeName,
          label: () => $gettext('Mit Typst Editor öffnen'),
          hasPriority: true,
          newFileMenu: {
            menuTitle: () => $gettext('Typst-Dokument'),
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
