import { notify } from '@affine/component';
import { AuthInput, ModalHeader } from '@affine/component/auth-components';
import { Button } from '@affine/component/ui/button';
import { useAsyncCallback } from '@affine/core/hooks/affine-async-hooks';
import { Trans } from '@affine/i18n';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { ArrowDownBigIcon } from '@blocksuite/icons';
import { useLiveData, useService } from '@toeverything/infra';
import type { FC } from 'react';
import { useCallback, useState } from 'react';

import { AuthService } from '../../../modules/cloud';
import { mixpanel } from '../../../utils';
import { emailRegex } from '../../../utils/email-regex';
import type { AuthPanelProps } from './index';
import { OAuth } from './oauth';
import * as style from './style.css';
import { Captcha, useCaptcha } from './use-captcha';

function validateEmail(email: string) {
  return emailRegex.test(email);
}

export const SignIn: FC<AuthPanelProps> = ({
  setAuthState,
  setAuthEmail,
  email,
  onSignedIn,
}) => {
  const t = useAFFiNEI18N();
  const authService = useService(AuthService);
  const loginStatus = useLiveData(authService.session.status$);
  const [isMutating, setIsMutating] = useState(false);
  const [verifyToken, challenge] = useCaptcha();

  const [isValidEmail, setIsValidEmail] = useState(true);

  if (loginStatus === 'authenticated') {
    onSignedIn?.();
  }

  const onContinue = useAsyncCallback(async () => {
    if (!validateEmail(email)) {
      setIsValidEmail(false);
      return;
    }

    setIsValidEmail(true);

    setIsMutating(true);
    const { hasPassword, isExist: isUserExist } =
      await authService.checkUserByEmail(email);

    setAuthEmail(email);
    try {
      if (verifyToken) {
        if (isUserExist) {
          // provider password sign-in if user has by default
          //  If with payment, onl support email sign in to avoid redirect to affine app
          if (hasPassword) {
            setAuthState('signInWithPassword');
          } else {
            mixpanel.track_forms('SignIn', 'Email', {
              email,
            });
            await authService.sendEmailMagicLink(email, verifyToken, challenge);
            setAuthState('afterSignInSendEmail');
          }
        } else {
          await authService.sendEmailMagicLink(email, verifyToken, challenge);
          mixpanel.track_forms('SignUp', 'Email', {
            email,
          });
          setAuthState('afterSignUpSendEmail');
        }
      }
    } catch (err) {
      console.error(err);

      // TODO: better error handling
      notify.error({
        message: 'Failed to send email. Please try again.',
      });
    }

    setIsMutating(false);
  }, [authService, challenge, email, setAuthEmail, setAuthState, verifyToken]);

  return (
    <>
      <ModalHeader
        title={t['com.affine.auth.sign.in']()}
        subTitle={t['com.affine.brand.affineCloud']()}
      />

      <OAuth />

      <div className={style.authModalContent}>
        <AuthInput
          label={t['com.affine.settings.email']()}
          placeholder={t['com.affine.auth.sign.email.placeholder']()}
          value={email}
          onChange={useCallback(
            (value: string) => {
              setAuthEmail(value);
            },
            [setAuthEmail]
          )}
          error={!isValidEmail}
          errorHint={
            isValidEmail ? '' : t['com.affine.auth.sign.email.error']()
          }
          onEnter={onContinue}
        />

        {verifyToken ? null : <Captcha />}

        {verifyToken ? (
          <Button
            size="extraLarge"
            data-testid="continue-login-button"
            block
            loading={isMutating}
            icon={
              <ArrowDownBigIcon
                width={20}
                height={20}
                style={{
                  transform: 'rotate(-90deg)',
                  color: 'var(--affine-blue)',
                }}
              />
            }
            iconPosition="end"
            onClick={onContinue}
          >
            {t['com.affine.auth.sign.email.continue']()}
          </Button>
        ) : null}

        <div className={style.authMessage}>
          {/*prettier-ignore*/}
          <Trans i18nKey="com.affine.auth.sign.message">
              By clicking &quot;Continue with Google/Email&quot; above, you acknowledge that
              you agree to AFFiNE&apos;s <a href="https://affine.pro/terms" target="_blank" rel="noreferrer">Terms of Conditions</a> and <a href="https://affine.pro/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
          </Trans>
        </div>
      </div>
    </>
  );
};
