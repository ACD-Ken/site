(() => {
  const $ = (id) => document.getElementById(id);
  const login = $('login-form');
  const loginButton = $('login-btn');
  const password = $('password');
  const panel = $('mfa-panel');
  const setup = $('mfa-setup');
  const start = $('mfa-start');
  const form = $('mfa-form');
  const code = $('mfa-code');
  const qr = $('mfa-qr');
  const secret = $('mfa-secret');
  const alert = $('login-error');
  const heading = $('login-heading');
  const mode = new URLSearchParams(location.search).get('console');
  const deviceConsole = mode === 'devices' || mode === 'approvals';
  const target = mode === 'approvals' ? '/dmsgbox-admin-console/pending-approvals.html'
    : deviceConsole ? '/dmsgbox-admin-console/' : 'admin.html';
  const factorName = 'DMsgBox Authenticator';
  const client = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let factorId;
  let busy = false;

  if (deviceConsole) $('console-name').textContent = mode === 'approvals' ? 'User Approvals' : 'Device Admin Console';

  function show(el, visible) {
    el.classList.toggle('hidden', !visible);
  }

  function report(message = '') {
    alert.textContent = message;
    show(alert, Boolean(message));
  }

  function clearSetup() {
    factorId = undefined;
    qr.removeAttribute('src');
    secret.textContent = '';
    code.value = '';
    show(setup, false);
    show(form, false);
  }

  function showCredentials() {
    clearSetup();
    heading.textContent = 'Sign in';
    show(panel, false);
    show(login, true);
  }

  function showChallenge(id, details) {
    factorId = id;
    heading.textContent = details ? 'Set up authenticator' : 'Verify your sign-in';
    if (details) {
      const image = details.qr_code;
      if (image.startsWith('data:image/svg+xml')) qr.src = image;
      else if (image.trimStart().startsWith('<svg')) qr.src = `data:image/svg+xml,${encodeURIComponent(image)}`;
      secret.textContent = details.secret;
    }
    show(setup, Boolean(details));
    show(start, false);
    show(form, true);
    code.focus();
  }

  async function hasAdminGrant(user) {
    if (deviceConsole) {
      if (!user.email || !user.email_confirmed_at) return false;
      const { data, error } = await client.from('admin_console_users')
        .select('role').eq('email', user.email).maybeSingle();
      if (error) throw error;
      return data?.role === 'admin';
    }
    const { data, error } = await client.from('blog_admins')
      .select('user_id').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  async function assuranceLevel() {
    const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    return data;
  }

  function continueToAdmin() {
    clearSetup();
    location.replace(target);
  }

  async function openAdminSignIn() {
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) throw new Error('No authenticated user');
    if (!await hasAdminGrant(user)) {
      const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
      if (signOutError) throw signOutError;
      showCredentials();
      report('This account does not have access to this admin console.');
      return;
    }

    const assurance = await assuranceLevel();
    if (assurance.currentLevel === 'aal2' && assurance.nextLevel === 'aal2') {
      continueToAdmin();
      return;
    }

    show(login, false);
    show(panel, true);
    const { data, error: factorsError } = await client.auth.mfa.listFactors();
    if (factorsError) throw factorsError;
    const verified = data.totp.find((factor) => factor.status === 'verified');
    if (verified) showChallenge(verified.id);
    else if (assurance.nextLevel === 'aal2') report('No authenticator app is available for this account. Contact your administrator.');
    else {
      heading.textContent = 'Protect your sign-in';
      show(start, true);
    }
  }

  async function run(action, errorMessage) {
    if (busy) return;
    busy = true;
    const controls = [loginButton, $('mfa-enroll'), $('mfa-verify'), $('mfa-sign-out')];
    controls.forEach((button) => { button.disabled = true; });
    report();
    try {
      await action();
    } catch {
      report(errorMessage);
    } finally {
      busy = false;
      controls.forEach((button) => { button.disabled = false; });
    }
  }

  login.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!client || !login.reportValidity()) return;
    run(async () => {
      const { error } = await client.auth.signInWithPassword({ email: $('email').value.trim(), password: password.value });
      password.value = '';
      if (error) {
        report('Sign-in failed. Check your email and password and try again.');
        return;
      }
      await openAdminSignIn();
    }, 'Could not check admin access. Try signing in again.');
  });

  $('mfa-enroll').addEventListener('click', () => run(async () => {
    const { data: factors, error: listError } = await client.auth.mfa.listFactors();
    if (listError) throw listError;
    const verified = factors.totp.find((factor) => factor.status === 'verified');
    if (verified) return showChallenge(verified.id);
    for (const factor of factors.all) {
      if (factor.factor_type !== 'totp' || factor.status !== 'unverified' || factor.friendly_name !== factorName) continue;
      const { error } = await client.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw error;
    }
    const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: factorName });
    if (error) throw error;
    showChallenge(data.id, data.totp);
  }, 'Could not set up the authenticator. Please try again.'));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!factorId || !/^[0-9]{6}$/.test(code.value)) return;
    run(async () => {
      const submittedCode = code.value;
      code.value = '';
      const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code: submittedCode });
      if (error) {
        report('Code not verified. Enter the current code from your authenticator app.');
        code.focus();
        return;
      }
      const assurance = await assuranceLevel();
      if (assurance.currentLevel !== 'aal2' || assurance.nextLevel !== 'aal2') throw new Error('MFA incomplete');
      continueToAdmin();
    }, 'Could not confirm your secure session. Try signing in again.');
  });

  $('mfa-sign-out').addEventListener('click', () => run(async () => {
    clearSetup();
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    showCredentials();
    $('email').focus();
  }, 'Could not sign out. Please try again.'));

  if (!client) {
    loginButton.disabled = true;
    report('The sign-in service could not load. Refresh this page to try again.');
    return;
  }
  run(async () => {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    if (session) await openAdminSignIn();
  }, 'Could not check your current session. Try signing in again.');
})();
