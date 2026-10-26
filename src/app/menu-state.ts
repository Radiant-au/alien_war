export type MenuView='main'|'setup'|'pause'|'battle'
/** Navigation state is separate from the running match and saved configuration. */
export class MenuNavigation {
  view:MenuView='main'
  hasMatch=false
  private setupOrigin:'main'|'pause'='main'
  setup(){this.setupOrigin=this.view==='pause'?'pause':'main';this.view='setup'}
  back(){if(this.view==='setup')this.view=this.setupOrigin==='pause'&&this.hasMatch?'pause':'main'}
  start(){if(this.view!=='setup')return false;this.hasMatch=true;this.view='battle';return true}
  pause(){if(this.view==='battle'&&this.hasMatch)this.view='pause'}
  resume(){if(this.view!=='pause'||!this.hasMatch)return false;this.view='battle';return true}
  main(){this.hasMatch=false;this.view='main'}
}
