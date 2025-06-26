export default act((self, { outbox, complete, fail }) =>
  sequence(() => [
    waitFor(
      (msg) => msg.type === 'EXECUTE_TRADE',
      (msg) => send(LedgerService, readState(msg, ({ payload }) => ({
        type: 'EXECUTE_TRADE',
        ...payload
      })))
    ),
    waitFor(
      (msg) => msg.type === 'TRADE_SUCCESS' || msg.type === 'TRADE_FAILED',
      (msg) => whenState(
        readState(msg, ({ type }) => type === 'TRADE_SUCCESS'),
        send(NotificationService, readState(msg, ({ payload }) => ({
          type: 'NOTIFY',
          message: 'Trade executed successfully',
          ...payload,
        }))),
        sequence(() => [
          send(NotificationService, readState(msg, ({ payload }) => ({
            type: 'NOTIFY',
            message: 'Trade failed',
            ...payload,
          }))),
          fail()
        ])
      )
    ),
    complete()
  ])
);