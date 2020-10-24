import React, { useEffect, useState } from 'react'
import './App.css'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import { useQuery } from '@apollo/react-hooks'
import gql from 'graphql-tag'
import uniswapLogo from '../uniswap-logo.png'
import daiLogo from '../dai-logo.png'

export const client = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2'
  }),
  fetchOptions: {
    mode: 'no-cors'
  },
  cache: new InMemoryCache()
})

const DAI_QUERY = gql`
  query tokens($tokenAddress: Bytes!) {
    tokens(where: {id: $tokenAddress}) {
      derivedETH
      totalLiquidity
    }
  }
`

const MULTI_TOKEN_QUERY = gql`
  query tokens($tokenAddresses: [Bytes]!) {
    tokens(where: {id_in: $tokenAddresses }) {
      name
      derivedETH
    }
  }
`


const ETH_PRICE_QUERY = gql`
  query bundles {
    bundles(where: {id: "1"}) {
      ethPrice
    }
  }
`


function App() {

  const { loading: ethLoading, data: ethPriceData } = useQuery(ETH_PRICE_QUERY, { pollInterval: 3000 })
  const { loading: daiLoading, data: daiData } = useQuery(DAI_QUERY, {
    variables:  {
      tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f'
    }
  })


  const { loading: multiTokensLoading, data: multiTokensData } = useQuery(MULTI_TOKEN_QUERY, {
    variables:  {
      tokenAddresses: [
        '0x6b175474e89094c44da98b954eedeac495271d0f',   //DAI
        '0x250a3500f48666561386832f1f1f1019b89a2699',   //SAFE2
        '0x26ce25148832c04f3d7f26f32478a9fe55197166'    //DEXT
      ]
    },
    pollInterval: 3000
  })

  const daiPriceInEth = daiData && daiData.tokens[0].derivedETH
  const tokens = multiTokensData && multiTokensData.tokens
  const ethPriceInUsd = ethPriceData && ethPriceData.bundles[0].ethPrice

  // setCurrentTokenData({ tokensLoading: multiTokensLoading, tokensData: tokens })
  // console.log("initial currentTokenData: ", currentTokenData)
  console.log('tokenData ', tokens)

  function generateTokenInfo() {
    // console.log("generateTokenInfo currentTokenData: ", currentTokenData)
    return tokens.map((token) => {
      return <div>
        {token.name} price:{' '}
        {(parseFloat(ethPriceInUsd) * parseFloat(token.derivedETH)).toFixed(4)}
        {'  | '}eth price : {parseFloat(token.derivedETH).toFixed(6)}
      </div>
    })
  }


  return (
    <div>
      <div className="content mr-auto ml-auto">
        <div>
          Dai price:{' '}
          { ethLoading || daiLoading
              ? 'Loading data..'
              : '$' + (parseFloat(ethPriceInUsd) * parseFloat(daiPriceInEth)).toFixed(2)
          }
        </div>
        { multiTokensLoading
            ?  "Lading multi-tokens.."
            :  generateTokenInfo()
        }
      </div>
    </div>
  );
}

export default App
