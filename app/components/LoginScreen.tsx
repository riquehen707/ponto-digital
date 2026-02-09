type AdminLogin = {
  email: string;
  password: string;
};

type LoginScreenProps = {
  origin: string;
  loginError: string;
  adminLogin: AdminLogin;
  adminLoginError: string;
  onAdminEmailChange: (value: string) => void;
  onAdminPasswordChange: (value: string) => void;
  onAdminLogin: () => void;
};

export default function LoginScreen({
  origin,
  loginError,
  adminLogin,
  adminLoginError,
  onAdminEmailChange,
  onAdminPasswordChange,
  onAdminLogin,
}: LoginScreenProps) {
  return (
    <div className="login-shell">
      <div className="login-card">
        <span className="login-brand">Ponto Vivo</span>
        <h1>Acesso</h1>
        <p className="login-subtitle">
          Funcionarios entram por link. Admin entra com email e senha.
        </p>
        {loginError ? <p className="login-error">{loginError}</p> : null}
        <div className="login-hint">
          <span>
            Link de colaborador: {origin ? `${origin}/?autologin=token` : "/?autologin=token"}
          </span>
          <span>Solicite o link ao admin.</span>
        </div>
        <div className="login-divider" />
        <div className="login-form">
          <label>Email admin</label>
          <input
            type="email"
            value={adminLogin.email}
            onChange={(event) => onAdminEmailChange(event.target.value)}
          />
          <label>Senha</label>
          <input
            type="password"
            value={adminLogin.password}
            onChange={(event) => onAdminPasswordChange(event.target.value)}
          />
          <button className="login-button action-btn" type="button" onClick={onAdminLogin}>
            Entrar como admin
          </button>
          {adminLoginError ? <p className="login-error">{adminLoginError}</p> : null}
          <div className="login-hint">
            <span>Primeiro acesso: admin@empresa.com / admin123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
