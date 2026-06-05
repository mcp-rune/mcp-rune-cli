declare module 'tiged' {
  interface TigedEmitter {
    clone(dest: string): Promise<void>;
  }
  interface TigedOptions {
    cache?: boolean;
    force?: boolean;
    verbose?: boolean;
    mode?: 'tar' | 'git';
    subgroup?: boolean;
    'sub-directory'?: string;
  }
  function tiged(src: string, opts?: TigedOptions): TigedEmitter;
  export default tiged;
}
