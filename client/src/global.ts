import * as AnnotateClient from "./index"

declare global {
  interface Window {
    AnnotateClient: typeof AnnotateClient
  }
}

window.AnnotateClient = AnnotateClient
