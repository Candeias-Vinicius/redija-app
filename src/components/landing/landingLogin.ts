/**
 * Marca os botões de login da landing (cartão do topo e banner final). Enquanto algum
 * deles estiver na tela, o botão de login do menu fixo fica oculto para não repetir.
 */
export const LANDING_LOGIN_ATTR = 'data-landing-login';

/** Spread nos botões de login da página: `<button {...landingLoginMarker} />`. */
export const landingLoginMarker = { [LANDING_LOGIN_ATTR]: '' } as const;
