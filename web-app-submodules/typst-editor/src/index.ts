import {
  type ApplicationInformation,
  AppWrapperRoute,
  defineWebApplication,
} from '@opencloud-eu/web-pkg';
import {useGettext} from 'vue3-gettext';
import App from './App.vue';

const appId = 'typst-editor';

export default defineWebApplication({
  setup() {
    const {$gettext} = useGettext();
    const routeName = 'typst-editor-file';

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
