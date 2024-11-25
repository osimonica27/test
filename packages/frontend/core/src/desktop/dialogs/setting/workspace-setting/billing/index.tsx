import { Button, Loading } from '@affine/component';
import { Pagination } from '@affine/component/member-components';
import {
  SettingHeader,
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { getUpgradeQuestionnaireLink } from '@affine/core/components/hooks/affine/use-subscription-notify';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { useMutation } from '@affine/core/components/hooks/use-mutation';
import { useWorkspaceInfo } from '@affine/core/components/hooks/use-workspace-info';
import {
  AuthService,
  InvoicesService,
  SubscriptionService,
} from '@affine/core/modules/cloud';
import { UrlService } from '@affine/core/modules/url';
import {
  createCustomerPortalMutation,
  type InvoicesQuery,
  InvoiceStatus,
  SubscriptionPlan,
  SubscriptionRecurring,
  UserFriendlyError,
} from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import {
  FrameworkScope,
  useLiveData,
  useService,
  type WorkspaceMetadata,
} from '@toeverything/infra';
import { cssVar } from '@toeverything/theme';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useWorkspace } from '../../../../../components/hooks/use-workspace';
import { ResumeAction } from '../../general-setting/plans/actions';
import * as styles from './styles.css';

export const WorkspaceSettingBilling = ({
  workspaceMetadata,
}: {
  workspaceMetadata: WorkspaceMetadata;
}) => {
  const t = useI18n();
  const workspace = useWorkspace(workspaceMetadata);
  const workspaceInfo = useWorkspaceInfo(workspaceMetadata);
  const title = workspaceInfo?.name || 'untitled';

  if (workspace === null) {
    console.log('workspace is null', title);

    return null;
  }

  return (
    <FrameworkScope scope={workspace.scope}>
      <SettingHeader
        title={t['com.affine.payment.billing-setting.title']()}
        subtitle={t['com.affine.payment.billing-setting.subtitle']()}
      />
      <SettingWrapper
        title={t['com.affine.payment.billing-setting.information']()}
      >
        <TeamCard />
        <TypeFormLink />
        <PaymentMethodUpdater />
        <ResumeSubscription />
      </SettingWrapper>

      <SettingWrapper title={t['com.affine.payment.billing-setting.history']()}>
        <BillingHistory />
      </SettingWrapper>
    </FrameworkScope>
  );
};

//TODO(@JimmFly): implement the logic for team plan
const TeamCard = () => {
  const t = useI18n();

  const expiration = false;
  const recurring = SubscriptionRecurring.Yearly;

  const description = useMemo(() => {
    if (recurring === SubscriptionRecurring.Yearly) {
      return t[
        'com.affine.settings.workspace.billing.team-workspace.description.billed.annually'
      ]();
    }
    if (recurring === SubscriptionRecurring.Monthly) {
      return t[
        'com.affine.settings.workspace.billing.team-workspace.description.billed.monthly'
      ]();
    }
    return t['com.affine.payment.billing-setting.free-trial']();
  }, [recurring, t]);

  const expirationDate = useMemo(() => {
    if (expiration) {
      return t[
        'com.affine.settings.workspace.billing.team-workspace.not-renewed'
      ]({
        date: new Date().toLocaleDateString(),
      });
    }
    return t[
      'com.affine.settings.workspace.billing.team-workspace.next-billing-date'
    ]({
      date: new Date().toLocaleDateString(),
    });
  }, [expiration, t]);

  return (
    <div className={styles.planCard}>
      <div className={styles.currentPlan}>
        <SettingRow
          spreadCol={false}
          name={t['com.affine.settings.workspace.billing.team-workspace']()}
          desc={
            <>
              <div>{description}</div>
              <div>{expirationDate}</div>
            </>
          }
        />
        <Button variant="primary" className={styles.cancelPlanButton}>
          {t[
            'com.affine.settings.workspace.billing.team-workspace.cancel-plan'
          ]()}
        </Button>
      </div>
      <p className={styles.planPrice}>
        $??
        <span className={styles.billingFrequency}>
          /{t['com.affine.payment.billing-setting.year']()}
        </span>
      </p>
    </div>
  );
};

//TODO(@JimmFly): implement the logic for team plan
const ResumeSubscription = () => {
  const t = useI18n();
  const [open, setOpen] = useState(false);
  const subscription = useService(SubscriptionService).subscription;
  const handleClick = useCallback(() => {
    setOpen(true);
  }, []);

  return (
    <SettingRow
      name={t['com.affine.payment.billing-setting.expiration-date']()}
      desc={t['com.affine.payment.billing-setting.expiration-date.description'](
        {
          expirationDate: new Date().toLocaleDateString(),
        }
      )}
    >
      <ResumeAction open={open} onOpenChange={setOpen}>
        <Button
          onClick={handleClick}
          data-event-props="$.settingsPanel.plans.resumeSubscription"
          data-event-args-type={subscription.pro$.value?.plan}
          data-event-args-category={subscription.pro$.value?.recurring}
        >
          {t['com.affine.payment.billing-setting.resume-subscription']()}
        </Button>
      </ResumeAction>
    </SettingRow>
  );
};

const TypeFormLink = () => {
  const t = useI18n();
  const subscriptionService = useService(SubscriptionService);
  const authService = useService(AuthService);

  //TODO(@JimmFly): implement the logic for Team plan
  const pro = useLiveData(subscriptionService.subscription.pro$);
  const ai = useLiveData(subscriptionService.subscription.ai$);
  const account = useLiveData(authService.session.account$);

  if (!account) return null;

  const plan = [];
  if (pro) plan.push(SubscriptionPlan.Pro);
  if (ai) plan.push(SubscriptionPlan.AI);

  const link = getUpgradeQuestionnaireLink({
    name: account.info?.name,
    id: account.id,
    email: account.email,
    recurring: pro?.recurring ?? ai?.recurring ?? SubscriptionRecurring.Yearly,
    plan,
  });

  return (
    <SettingRow
      className={styles.paymentMethod}
      name={t['com.affine.payment.billing-type-form.title']()}
      desc={t['com.affine.payment.billing-type-form.description']()}
    >
      <a target="_blank" href={link} rel="noreferrer">
        <Button>{t['com.affine.payment.billing-type-form.go']()}</Button>
      </a>
    </SettingRow>
  );
};

const PaymentMethodUpdater = () => {
  const { isMutating, trigger } = useMutation({
    mutation: createCustomerPortalMutation,
  });
  const urlService = useService(UrlService);
  const t = useI18n();

  //TODO(@JimmFly): implement the logic for team plan
  const update = useAsyncCallback(async () => {
    await trigger(null, {
      onSuccess: data => {
        urlService.openPopupWindow(data.createCustomerPortal);
      },
    });
  }, [trigger, urlService]);

  return (
    <SettingRow
      className={styles.paymentMethod}
      name={t['com.affine.payment.billing-setting.payment-method']()}
      desc={t[
        'com.affine.payment.billing-setting.payment-method.description'
      ]()}
    >
      <Button onClick={update} loading={isMutating} disabled={isMutating}>
        {t['com.affine.payment.billing-setting.payment-method.go']()}
      </Button>
    </SettingRow>
  );
};

//TODO(@JimmFly): implement the logic for team plan
const BillingHistory = () => {
  const t = useI18n();

  const invoicesService = useService(InvoicesService);
  const pageInvoices = useLiveData(invoicesService.invoices.pageInvoices$);
  const invoiceCount = useLiveData(invoicesService.invoices.invoiceCount$);
  const isLoading = useLiveData(invoicesService.invoices.isLoading$);
  const error = useLiveData(invoicesService.invoices.error$);
  const pageNum = useLiveData(invoicesService.invoices.pageNum$);

  useEffect(() => {
    invoicesService.invoices.revalidate();
  }, [invoicesService]);

  const handlePageChange = useCallback(
    (_: number, pageNum: number) => {
      invoicesService.invoices.setPageNum(pageNum);
      invoicesService.invoices.revalidate();
    },
    [invoicesService]
  );

  if (invoiceCount === undefined) {
    if (isLoading) {
      return <BillingHistorySkeleton />;
    } else {
      return (
        <span style={{ color: cssVar('errorColor') }}>
          {error
            ? UserFriendlyError.fromAnyError(error).message
            : 'Failed to load members'}
        </span>
      );
    }
  }

  return (
    <div className={styles.history}>
      <div className={styles.historyContent}>
        {invoiceCount === 0 ? (
          <p className={styles.noInvoice}>
            {t['com.affine.payment.billing-setting.no-invoice']()}
          </p>
        ) : (
          pageInvoices?.map(invoice => (
            <InvoiceLine key={invoice.id} invoice={invoice} />
          ))
        )}
      </div>

      {invoiceCount > invoicesService.invoices.PAGE_SIZE && (
        <Pagination
          totalCount={invoiceCount}
          countPerPage={invoicesService.invoices.PAGE_SIZE}
          pageNum={pageNum}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

const InvoiceLine = ({
  invoice,
}: {
  invoice: NonNullable<InvoicesQuery['currentUser']>['invoices'][0];
}) => {
  const t = useI18n();
  const urlService = useService(UrlService);

  const open = useCallback(() => {
    if (invoice.link) {
      urlService.openPopupWindow(invoice.link);
    }
  }, [invoice.link, urlService]);

  return (
    <SettingRow
      key={invoice.id}
      name={new Date(invoice.createdAt).toLocaleDateString()}
      desc={`${
        invoice.status === InvoiceStatus.Paid
          ? t['com.affine.payment.billing-setting.paid']()
          : ''
      } $${invoice.amount / 100}`}
    >
      <Button onClick={open}>
        {t['com.affine.payment.billing-setting.view-invoice']()}
      </Button>
    </SettingRow>
  );
};

const BillingHistorySkeleton = () => {
  return (
    <div className={styles.billingHistorySkeleton}>
      <Loading />
    </div>
  );
};
