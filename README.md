
## Steps for running in Dev mode

1. Specify the contract address of the locally deployed Smart Contract, the emitted Events and their handlers in `subgraph.template.yaml` file.

2. `npm run codegen` whenever there are changes in `schema.graphql` file or the Contract abi(abis/*.json)

3. `npm run prepare:local` to create `subgraph.yaml` file.

4. Start a graph-node instance with `docker-compose up`

5. `npm run create-local` to create an instance of the graph (run only first time. Subsequent Deployments are done on the same graph node instance)

6. `npm run deploy-local` to deploy event handler mappings to the graph node.



## Deployment Steps


sign up on the graph with a github account
create a graph project


1. `npm install -g @graphprotocol/graph-cli`

2. `graph auth --product hosted-service <ACCESS_TOKEN>`

npm run codegen

set contract address and startblock in <network>.json

set repository address (<gitUserName>/<graphProjectName>) in subgraph.template.yaml and package.json

3. `npm run deploy`