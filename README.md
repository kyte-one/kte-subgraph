# kyte-one-subgraph

# Query total btc market

# Query all BTC/USD asset
```
query {
  asset(assetId: id) {
    markets {

    }
  }
}
```

# Query all market predictions
```
query {
  market (id: marketId) {
    predictions {

    }
  }
}
```

# Query market pool predictions
```
query {
  pools (id: poolId) {

  }
}
```

# Query current user , current market prediction
```
query {
  user (id: userId) {
    predictions {
      market(id: marketId) {
        predictions {}
      }
    }
  }
}
```

# query user open market predictions
```
query {
  user(id: userId) {
    predictions(where: { rewardClaimed: False}) {

    }
  }
}
```

# query user all predictions
```
query {
  user(id: userId) {
    predictions {

    }
  }
}
```

```
User (id) {
  predictions() {

  }
}
```

```
User (id) {
  predictions(where: { rewardClaimed: false}) {

  }
}
```

```
Markets(where: { userId: userId, rewardClaimed: }) {

}
```
