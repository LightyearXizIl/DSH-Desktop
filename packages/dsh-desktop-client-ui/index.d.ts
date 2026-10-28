export declare const name: 'dsh-desktop-client-ui'
export declare const inject: ['connection']

export interface DesktopClientUiHostContext {
  connection: {
    fetch: {
      register(route: {
        path: string
        methods: string[]
        requestBody: 'buffered'
        fetch: () => Promise<Response>
      }): unknown
    }
  }
}

export declare function apply(ctx: DesktopClientUiHostContext): void
