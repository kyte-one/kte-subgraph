
## Steps

1. Deploy smart contract to index and specify the contract address in subgraph.yaml file.

2. Start a graph-node instance with `docker-compose up`

3. `npm run codegen` whenever there are changes in `schema.graphql` file or the Contract abi(abis/*.json)

4. `npm run deploy-local` to deploy event handler mappings to the graph node.