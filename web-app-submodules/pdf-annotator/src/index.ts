import {
  type ApplicationInformation,
  AppWrapperRoute,
  defineWebApplication,
} from '@opencloud-eu/web-pkg';
import {useGettext} from 'vue3-gettext';
import App from './App.vue';

const appId = 'pdf-annotator';

export default defineWebApplication({
  setup() {
    const {$gettext} = useGettext();
    const routeName = 'pdf-annotator-file';

    const routes = [
      {
        path: '/:driveAliasAndItem(.*)?',
        name: routeName,
        component: AppWrapperRoute(App, {
          applicationId: appId,
          fileContentOptions: {
            responseType: 'arraybuffer',
          },
        }),
        meta: {
          authContext: 'hybrid',
          title: $gettext('PDF Annotator'),
          patchCleanPath: true,
        },
      },
    ];

    const appInfo: ApplicationInformation = {
      id: appId,
      name: $gettext('PDF Annotator'),
      icon: 'file-pdf',
      color: '#b3261e',
      defaultExtension: 'pdf',
      meta: {
        // Annotated PDFs are held in memory as a whole; warn for very large files.
        fileSizeLimit: 100_000_000,
      },
      extensions: [
        {
          extension: 'pdf',
          mimeType: 'application/pdf',
          routeName,
          label: () => $gettext('Mit PDF Annotator öffnen'),
          hasPriority: true,
        },
      ],
    };

    return {
      appInfo,
      routes,
    };
  },
});
