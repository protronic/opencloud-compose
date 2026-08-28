import {
  type ApplicationInformation,
  AppWrapperRoute,
  defineWebApplication,
  useClientService,
  useRouter,
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

    try {
      // Wiki navigation: open another .typ file of the same space. The route
      // is built the same way the host builds file routes - via the space's
      // drive alias plus the target's fileId - instead of string surgery on
      // the current URL. A missing target is created empty first, so wiki
      // links to new pages open the editor on a fresh document.
      const clientService = useClientService();
      const router = useRouter();
      ocContext.openTyp = async (space, targetResourcePath) => {
        let fileId: string | undefined;
        try {
          const info = await clientService.webdav.getFileInfo(space, {
            path: targetResourcePath,
          });
          fileId = info.fileId ?? info.id;
        } catch {
          const created = await clientService.webdav.putFileContents(space, {
            path: targetResourcePath,
            content: '',
          });
          fileId = created.fileId ?? created.id;
        }
        const route = router.currentRoute.value;
        // The stale fileId of the current document would send the AppWrapper's
        // replaceInvalidFileRoute back to the old file.
        const query = {...route.query};
        delete query.fileId;
        if (fileId) query.fileId = fileId;
        await router.push({
          name: route.name ?? routeName,
          params: {
            ...route.params,
            driveAliasAndItem: space.getDriveAliasAndItem({
              path: targetResourcePath,
            } as Parameters<typeof space.getDriveAliasAndItem>[0]),
          },
          query,
        });
      };
    } catch {
      ocContext.openTyp = undefined;
    }

    try {
      // Hand the current file over to the typst-wysiwyg extension: same
      // driveAliasAndItem and query (same file, same fileId), only the
      // route changes.
      const router = useRouter();
      ocContext.openInWysiwyg = async () => {
        const wysiwygRoute = 'typst-wysiwyg-file';
        if (!router.hasRoute(wysiwygRoute)) {
          throw new Error('Die Typst-WYSIWYG-Erweiterung ist nicht installiert');
        }
        const route = router.currentRoute.value;
        await router.push({name: wysiwygRoute, params: route.params, query: route.query});
      };
    } catch {
      ocContext.openInWysiwyg = undefined;
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
