---
title: 'Troubleshoot Timeboost'
description: A guide on common errors & best practices when using Timeboost
user_story: As a developer, I want to understand how to troubleshoot common issues when using Timeboost
author: dlee
content_type: how-to
---

This is a short guide on how response times work and how <a data-quicklook-from="express-lane">express lane</a> <a data-quicklook-from="transaction">transactions</a> are sequenced, alongside common errors and best practices for using <a data-quicklook-from="timeboost">Timeboost</a>. This guide assumes you have reviewed our guide on [How to use Timeboost](../run-arbitrum-node/how-to-use-timeboost.mdx).


## How express lane transactions are ordered into blocks

The express lane time advantage is currently set to 200ms, while the current block creation time is 250ms. Both express lane transactions and regular transactions are processed together in a single queue after taking into account the timeboost time advantage and artificial delay. This means that if an express lane transaction and a normal transaction both arrive at the <a data-quicklook-from="sequencer">sequencer</a> at the same time, but _before 50ms have passed since the last block was produced_, then both transactions may appear in the same block, though the express lane transaction would be sequenced ahead of the normal transaction (assuming that the block's gas limit has not yet been reached).

Express lane transactions are processed in the order of their `sequenceNumber`, which is a field in every express lane transaction. The `sequenceNumber` field is important because transactions with `sequenceNumber=n` can only be sequenced after all the transactions from `sequenceNumber=0` to `sequenceNumber=n-1` have been sequenced. The first expected sequence number for a new round is zero and increments for each accepted transaction.

## How response times work

The response for a transaction submission to the express lane is returned immediately once received by the sequencer. For example, if an express lane transaction is sent to the sequencer at `t=0ms` and it took 50ms to arrive at the sequencer (defined as `time_to_arrive`), then the expected response time is at `t=50ms`. Note that an accepted transaction is defined as an express lane transaction submission where the sequencer returns an empty result with an HTTP status of `200` and will always have their `sequenceNumber` consumed. You can read more about how to submit express lane transactions in: [How to submit transactions to the express lane](../run-arbitrum-node/how-to-use-timeboost.mdx#how-to-submit-transactions-to-the-express-lane).


## Errors relating to the sequenceNumber

When it comes to submitting express lane transactions, there are a few scenarios to consider.

### Scenario 1: You get an error response immediately
In this scenario, an error response is immediately returned after you send an express lane transaction. The transaction's `sequenceNumber` will be consumed and you may need to re-submit your transaction after rectifying any errors. See [How to submit transactions to the express lane](../run-arbitrum-node/how-to-use-timeboost.mdx#how-to-submit-transactions-to-the-express-lane) for a full list of error responses and how to interpret them.

### Scenario 2: Your transaction got an empty response with an HTTP status of `200`
In this scenario, a `null` response is immediately returned after you send an express lane transaction. This means that your transaction's `sequenceNumber` was consumed and your transaction was accepted. However, this does not mean that your transaction was sequenced into a block due to a block-based timeout explained below. We recommend checking transaction receipts for confirmation on whether your transactions were sequenced into a block or not.

#### The block-based timeout for express lane transactions
If the express lane controller decides to send a burst of transactions to the express lane with ascending values for the `sequenceNumber`, then the sequencer will attempt to process them in the order defined by the `sequenceNumber` (as explained above). However, if the transactions arrive out-of-order at the sequencer, then the transactions that do not have the expected `sequenceNumber` will be buffered to be processed until the sequencer receives the transaction with the expected `sequenceNumber`. Once the sequencer receives the transaction with the expected `sequenceNumber`, then the sequencer will begin processing the buffered transaction with the next `sequenceNumber`. In other words, a transaction will only be sequenced into a block once transactions with the other, missing sequence numbers arrive to fill in the “gap” between the expected `sequencerNumber` and a given transaction’s `sequenceNumber`. 

A block-based timeout is applied to all express lane transactions, even those in the buffer, such that any transactions received at the sequencer will be dropped and have their `sequenceNumber` consumed if they are not sequenced into a block within 5 blocks. This timeout can occur if the cummulative gas usage of transactions (express lane or otherwise) fill up 5 blocks worth of transactions _before_ all of the buffered express lane transactions are sequenced. Note that each Arbitrum block has a gas limit of 32 million gas and 1 Arbitrum block is produced every 250ms. No timeout error will be returned in this case and we recommend checking transaction receipts for confirmation on whether your transactions were sequenced into a block or not. 