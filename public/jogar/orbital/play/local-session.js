// A local transport adapter keeps rendering independent of the simulation worker.
window.OrbitalLocalSession = class extends EventTarget {
  constructor() {
    super();
    this.readyState = 0;
    this.worker = new Worker(new URL('./solo-worker.js', document.baseURI), {type:'module'});
    this.worker.onmessage = ({data}) => {
      if (data.t === 'hello') { this.readyState = 1; this.dispatchEvent(new Event('open')); }
      this.dispatchEvent(new MessageEvent('message', {data:JSON.stringify(data)}));
    };
    this.worker.onerror = () => { this.dispatchEvent(new Event('error')); this.close(); };
  }
  send(raw) { if (this.readyState === 1) this.worker.postMessage(JSON.parse(raw)); }
  close() { if (this.readyState === 3) return; this.readyState = 3; this.worker.terminate(); this.dispatchEvent(new Event('close')); }
};
