/**
 * Configuración de `RTCPeerConnection`. Sin servidores ICE: emisor y espectadores están en la
 * misma red, así que bastan los candidatos de host. Fuera de una LAN hace falta STUN y, tras NAT
 * simétrico o firewalls corporativos, un TURN.
 */

/** Configuración compartida por emisor y espectadores. */
export const RTC_CONFIG: RTCConfiguration = { iceServers: [] };
