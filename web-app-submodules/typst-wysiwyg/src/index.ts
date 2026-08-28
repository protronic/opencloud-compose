import {
  type ApplicationInformation,
  AppWrapperRoute,
  defineWebApplication,
} from '@opencloud-eu/web-pkg';
import {useGettext} from 'vue3-gettext';
import App from './App.vue';

const appId = 'typst-wysiwyg';

export default defineWebApplication({
  setup() {
    const {$gettext} = useGettext();
    const routeName = 'typst-wysiwyg-file';

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
          title: $gettext('Typst WYSIWYG'),
          patchCleanPath: true,
        },
      },
    ];

    const appInfo: ApplicationInformation = {
      id: appId,
      name: $gettext('Typst WYSIWYG'),
      icon: 'edit-box',
      color: '#2a9d8f',
      extensions: [
        {
          // No hasPriority: the typst-editor stays the default for .typ;
          // this app appears as an additional "Open with" entry.
          extension: 'typ',
          routeName,
          label: () => $gettext('Mit Typst WYSIWYG öffnen'),
        },
      ],
    };

    return {
      appInfo,
      routes,
    };
  },
});
