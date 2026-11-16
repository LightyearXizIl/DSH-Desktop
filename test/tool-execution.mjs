/**
 * Tool execution for test compositions.
 *
 * Since Harness 0.2.2 `ToolRuntime` only registers tools; running them is owned
 * by an executor plugin, and `ctx.tools.execute()` takes a whole model step's
 * calls and returns one result per call. A composition without an executor
 * rejects with `ToolExecutorUnavailableError`. Tests that exercise one tool
 * load the native executor and go through `executeTool`.
 */
import * as NativeToolExecutor from '@deepseek-ai/dsh-tool-executor-native'

/** The executor plugin the Harness default composition mounts; load it after `ToolRuntime`. */
export { NativeToolExecutor }

/**
 * Run one tool call through the composition's executor.
 * @param {import('@deepseek-ai/cordis').Context} ctx - composition with `ToolRuntime` and an executor loaded.
 * @param {{ callId: string, name: string, arguments?: unknown, agent?: unknown, signal?: AbortSignal }} call
 *   - the call as a model would issue it; `arguments` is the parsed argument object.
 * @returns {Promise<import('@deepseek-ai/dsh-tools').ToolExecutionResult>} the call's settled result.
 */
export async function executeTool(ctx, { callId, name, arguments: args, agent, signal }) {
  const batch = await ctx.tools.execute({
    calls: [{ type: 'tool-call', id: callId, name, arguments: JSON.stringify(args ?? {}) }],
    signal: signal ?? new AbortController().signal,
    ...(agent === undefined ? {} : { agent })
  })
  const settled = batch.results.find((entry) => entry.callId === callId)
  if (settled === undefined) throw new Error(`tool call "${callId}" produced no result`)
  return settled.result
}
