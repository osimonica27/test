import { DocsService } from '@affine/core/modules/doc';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import {
  TemplateDocService,
  TemplateListMenu,
} from '@affine/core/modules/template-doc';
import { useI18n } from '@affine/i18n';
import type { Store } from '@blocksuite/affine/store';
import {
  AiIcon,
  EdgelessIcon,
  TemplateColoredIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import {
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAsyncCallback } from '../../hooks/affine-async-hooks';
import * as styles from './starter-bar.css';

const Badge = forwardRef<
  HTMLLIElement,
  HTMLAttributes<HTMLLIElement> & {
    icon: React.ReactNode;
    text: string;
    active?: boolean;
  }
>(function Badge({ icon, text, className, active, ...attrs }, ref) {
  return (
    <li
      data-active={active}
      className={clsx(styles.badge, className)}
      ref={ref}
      {...attrs}
    >
      <span className={styles.badgeText}>{text}</span>
      <span className={styles.badgeIcon}>{icon}</span>
    </li>
  );
});

const StarterBarNotEmpty = ({ doc }: { doc: Store }) => {
  const t = useI18n();

  const templateDocService = useService(TemplateDocService);
  const featureFlagService = useService(FeatureFlagService);
  const docsService = useService(DocsService);

  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);

  const isTemplate = useLiveData(
    useMemo(
      () => templateDocService.list.isTemplate$(doc.id),
      [doc.id, templateDocService.list]
    )
  );
  const enableTemplateDoc = useLiveData(
    featureFlagService.flags.enable_template_doc.$
  );

  const handleSelectTemplate = useAsyncCallback(
    async (templateId: string) => {
      await docsService.duplicateFromTemplate(templateId, doc.id);
    },
    [doc.id, docsService]
  );

  const showAI = false;
  const showEdgeless = false;
  const showTemplate = !isTemplate && enableTemplateDoc;

  if (!showAI && !showEdgeless && !showTemplate) {
    return null;
  }

  return (
    <div className={styles.root}>
      {t['com.affine.page-starter-bar.start']()}
      <ul className={styles.badges}>
        {showAI ? (
          <Badge
            icon={<AiIcon />}
            text={t['com.affine.page-starter-bar.ai']()}
          />
        ) : null}

        {showTemplate ? (
          <TemplateListMenu
            onSelect={handleSelectTemplate}
            rootOptions={{
              open: templateMenuOpen,
              onOpenChange: setTemplateMenuOpen,
            }}
          >
            <Badge
              data-testid="template-docs-badge"
              icon={<TemplateColoredIcon />}
              text={t['com.affine.page-starter-bar.template']()}
              active={templateMenuOpen}
            />
          </TemplateListMenu>
        ) : null}

        {showEdgeless ? (
          <Badge
            icon={<EdgelessIcon />}
            text={t['com.affine.page-starter-bar.edgeless']()}
          />
        ) : null}
      </ul>
    </div>
  );
};

export const StarterBar = ({ doc }: { doc: Store }) => {
  const [isEmpty, setIsEmpty] = useState(doc.isEmpty);

  useEffect(() => {
    const disposable = doc.slots.blockUpdated.on(() => {
      setIsEmpty(doc.isEmpty);
    });
    return () => {
      disposable.dispose();
    };
  }, [doc]);

  if (!isEmpty) return null;

  return <StarterBarNotEmpty doc={doc} />;
};
