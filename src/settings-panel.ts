import type { GraphicsQuality, VisualSettings } from './render-policy';
import './settings.css';

export const QUALITY_OPTIONS: {id:GraphicsQuality;label:string;description:string;limit:string}[] = [
  {id:'economy',label:'Ahorro',description:'Imagen más liviana, sin sombras dinámicas. Para reducir el trabajo gráfico.',limit:'Hasta 20 cuadros por segundo'},
  {id:'balanced',label:'Equilibrado',description:'Sombras y movimiento moderado. La opción inicial del juego.',limit:'Hasta 30 cuadros por segundo'},
  {id:'high',label:'Más fluidez',description:'Mayor resolución y más cuadros. Puede exigir más al teléfono.',limit:'Hasta 60 cuadros por segundo'},
];

export function settingsPanel(settings:VisualSettings,systemReduced:boolean,saveWarning:string):string {
  return `<section class="visual-settings"><p class="intro-copy">Elegí cómo se ve y se mueve tu murga en este dispositivo.</p>
    <fieldset class="quality-options"><legend>Calidad del escenario y el taller</legend>${QUALITY_OPTIONS.map(option=>`<label class="quality-option ${settings.quality===option.id?'selected':''}"><input type="radio" name="graphics-quality" value="${option.id}" ${settings.quality===option.id?'checked':''}><span><strong>${option.label}</strong><small>${option.description}</small><em>${option.limit}</em></span></label>`).join('')}</fieldset>
    <label class="reduce-motion"><span><strong>Reducir movimiento</strong><small>Detiene la animación del elenco y las luces. Podés seguir girando la cámara y cambiando la ropa.</small></span><input type="checkbox" data-reduce-motion ${settings.reducedMotion?'checked':''}></label>
    ${systemReduced?'<p class="settings-note">Tu dispositivo tiene activada la reducción de movimiento. El juego también respeta esa preferencia.</p>':''}
    <p class="settings-note">El escenario se pausa cuando abrís un panel, el taller o dejás de verlo. Al volver, la partida continúa en la misma jornada.</p>
    <p class="settings-save" role="status">${saveWarning||'Las preferencias se guardan en este dispositivo.'}</p>
    <button type="button" class="outline-button" data-open="help">Cómo jugar</button>
  </section>`;
}
