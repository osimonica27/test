import { Button, FlexWrapper, Switch } from '@affine/component';
import { SettingRow } from '@affine/component/setting-components';
import { config, Unreachable } from '@affine/env';
import type {
  AffineLegacyCloudWorkspace,
  LocalWorkspace,
} from '@affine/env/workspace';
import { WorkspaceFlavour } from '@affine/env/workspace';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { useBlockSuiteWorkspaceName } from '@toeverything/hooks/use-block-suite-workspace-name';
import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { useToggleWorkspacePublish } from '../../../hooks/affine/use-toggle-workspace-publish';
import type { AffineOfficialWorkspace } from '../../../shared';
import { toast } from '../../../utils';
import { EnableAffineCloudModal } from '../enable-affine-cloud-modal';
import { TmpDisableAffineCloudModal } from '../tmp-disable-affine-cloud-modal';
import type { WorkspaceSettingDetailProps } from './index';
import * as style from './style.css';

export type PublishPanelProps = WorkspaceSettingDetailProps & {
  workspace: AffineOfficialWorkspace;
};
export type PublishPanelLocalProps = WorkspaceSettingDetailProps & {
  workspace: LocalWorkspace;
};
export type PublishPanelAffineProps = WorkspaceSettingDetailProps & {
  workspace: AffineLegacyCloudWorkspace;
};

const PublishPanelAffine: FC<PublishPanelAffineProps> = props => {
  const { workspace } = props;
  const t = useAFFiNEI18N();
  const toggleWorkspacePublish = useToggleWorkspacePublish(workspace);

  const [origin, setOrigin] = useState('');
  const shareUrl = origin + '/public-workspace/' + workspace.id;

  useEffect(() => {
    setOrigin(
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : ''
    );
  }, []);

  const copyUrl = useCallback(async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast(t['Copied link to clipboard']());
  }, [shareUrl, t]);
  return (
    <>
      <SettingRow
        name={t['Publish']()}
        desc={
          workspace.public ? t['Unpublished hint']() : t['Published hint']()
        }
      >
        <Switch
          checked={workspace.public}
          onChange={checked => toggleWorkspacePublish(checked)}
        />
      </SettingRow>
      <FlexWrapper justifyContent="space-between">
        <Button
          className={style.urlButton}
          size="middle"
          onClick={useCallback(() => {
            window.open(shareUrl, '_blank');
          }, [shareUrl])}
          title={shareUrl}
        >
          {shareUrl}
        </Button>
        <Button size="middle" onClick={copyUrl}>
          {t['Copy']()}
        </Button>
      </FlexWrapper>
    </>
  );
};

const FakePublishPanelAffine: FC<{
  workspace: AffineOfficialWorkspace;
}> = ({ workspace }) => {
  const t = useAFFiNEI18N();
  const [origin, setOrigin] = useState('');
  const shareUrl = origin + '/public-workspace/' + workspace.id;

  useEffect(() => {
    setOrigin(
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : ''
    );
  }, []);
  return (
    <div className={style.fakeWrapper}>
      <SettingRow name={t['Publish']()} desc={t['Unpublished hint']()}>
        <Switch checked={false} />
      </SettingRow>
      <FlexWrapper justifyContent="space-between">
        <Button className={style.urlButton} size="middle" title={shareUrl}>
          {shareUrl}
        </Button>
        <Button size="middle">{t['Copy']()}</Button>
      </FlexWrapper>
    </div>
  );
};
const PublishPanelLocal: FC<PublishPanelLocalProps> = ({
  workspace,
  onTransferWorkspace,
}) => {
  const t = useAFFiNEI18N();
  const [name] = useBlockSuiteWorkspaceName(workspace.blockSuiteWorkspace);

  const [open, setOpen] = useState(false);

  return (
    <>
      <SettingRow
        name={t['Workspace saved locally']({ name })}
        desc={t['Enable cloud hint']()}
        spreadCol={false}
      >
        <Button
          data-testid="publish-enable-affine-cloud-button"
          type="primary"
          shape="circle"
          onClick={() => {
            setOpen(true);
          }}
          style={{ marginTop: '12px' }}
        >
          {config.enableLegacyCloud
            ? t['Enable AFFiNE Cloud']()
            : 'Disable AFFiNE Cloud'}
        </Button>
      </SettingRow>
      <FakePublishPanelAffine workspace={workspace} />
      {config.enableLegacyCloud ? (
        <EnableAffineCloudModal
          open={open}
          onClose={() => {
            setOpen(false);
          }}
          onConfirm={() => {
            onTransferWorkspace(
              WorkspaceFlavour.LOCAL,
              WorkspaceFlavour.AFFINE,
              workspace
            );
            setOpen(false);
          }}
        />
      ) : (
        <TmpDisableAffineCloudModal
          open={open}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
};

export const PublishPanel: FC<PublishPanelProps> = props => {
  if (props.workspace.flavour === WorkspaceFlavour.AFFINE) {
    return <PublishPanelAffine {...props} workspace={props.workspace} />;
  } else if (props.workspace.flavour === WorkspaceFlavour.LOCAL) {
    return <PublishPanelLocal {...props} workspace={props.workspace} />;
  }
  throw new Unreachable();
};
