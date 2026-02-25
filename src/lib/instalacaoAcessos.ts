const TEMPLATE_ACESSOS = `*INSTALAÇÃO COMPLETA*

* *n8n*
* URL n8n: https://back.MUDAR/home/workflows
* Email: suporte@MUDAR
* Senha: EjGse3_0@t50OPo

* *Portainer*
* URL: painel.MUDAR
* Login: admin
* Senha: EjGse3_0@t50OPo

* *Aplicativo*
* URL: app.MUDAR/login
* *Crie o primeiro acesso do painel admin abaixo*

* *Painel de Administração*
* URL: app.MUDAR/acesso-admin
* Login: admin
* Senha: EjGse3_0@t50OPo
* *Cuidado para não errar a senha do painel de ADM para não bloquear*`;

export function gerarTextoAcessos(dominio: string): string {
  return TEMPLATE_ACESSOS.replace(/MUDAR/g, dominio.trim());
}
