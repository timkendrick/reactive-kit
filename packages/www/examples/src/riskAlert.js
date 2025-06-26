export default act((self, { outbox }) =>
  whileLoop(() =>
    waitFor(
      (msg) => msg.type === 'EXECUTE_TRADE',
      ({ payload }) => sequence(() => [
        send(outbox, { type: 'VERIFY_TRADE_RISK', trade: payload }),
        waitFor(
          (msg) => msg.type === 'RISK_LIMIT_VALID' || msg.type === 'RISK_LIMIT_EXCEEDED',
          (msg) => whenState(
            readState(msg, ({ type }) => type === 'RISK_LIMIT_EXCEEDED'),
            sequence(() => [
              send(NotificationService, {
                type: 'NOTIFY',
                message: 'Risk limit exceeded',
                trade: payload,
              }),
            ])
          )
        )
      ])
    )
  )
  // Loop indefinitely until the next EXECUTE_TRADE message arrives
);