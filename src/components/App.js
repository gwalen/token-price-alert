import React, { useEffect, useState, useRef } from 'react'
import './App.css'


import PerfectScrollbar from 'perfect-scrollbar';

import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import { useQuery } from '@apollo/react-hooks'
import gql from 'graphql-tag'
// import tokenJson from '../data/tokens.json'
import tokenJson from '../data/tokens_draftv2.json'

import { Card, CardHeader, CardImg, CardBody, CardTitle, CardText, Row, Col } from 'reactstrap';
import {Table} from "reactstrap";


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
      id
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

const tokenAddresses = tokenJson.map(tokenInfo => tokenInfo.address)

// TODO clear; devDependencies
// should I use gulp or webpack?

function App() {

  const refreshCounter = useRef(-1)

  const { loading: ethLoading, data: ethPriceData } = useQuery(ETH_PRICE_QUERY, { pollInterval: 3000 })
  const { loading: daiLoading, data: daiData } = useQuery(DAI_QUERY, {
    variables:  {
      tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f'
    }
  })

  const { loading: multiTokensLoading, data: multiTokensData } = useQuery(MULTI_TOKEN_QUERY, {
    variables:  {
      tokenAddresses: tokenAddresses
    },
    pollInterval: 30000
  })

  refreshCounter.current++;

  const daiPriceInEth = daiData && daiData.tokens[0].derivedETH
  const tokens = multiTokensData && multiTokensData.tokens
  const ethPriceInUsd = ethPriceData && ethPriceData.bundles[0].ethPrice

  console.log('tokenData ', tokens)

  function printAlert(alert) {
    return (
      <div style={{color: alert.type === '>' ? 'green' : 'red', float: 'left'}}>
        { alert.completed
            ? <b><s>{alert.type}{' -- '}{alert.value}{' -- '}{String(alert.completed)}&nbsp;&nbsp;</s></b>
            : <b>{alert.type}{' -- '}{alert.value}{' -- '}{String(alert.completed)}&nbsp;&nbsp;</b>
        }
      </div>
    )
  }

  function findAlerts(tokenAddress) {
    console.log('find alerts for address: ', tokenAddress)
    return tokenJson
      .filter(tokenInfo => tokenInfo.address === tokenAddress)
      .map(tokenInfo => {
        // console.log('fund token : ', tokenInfo.address)
        // console.log('fund token alerts : ', tokenInfo.alerts)
        tokenInfo.alerts.map(alert => console.log('alert : ', alert))
        // const alertsHtml = tokenInfo.alerts.map(alert => <div style={{color: alert.type === '>' ? "green" : "red" }}>{alert.type}{' -- '}{alert.value}{' -- '}{String(alert.completed)}</div>)
        const alertsHtml = tokenInfo.alerts.map(alert => printAlert(alert))
        // console.log('alertsHtml : ', alertsHtml)

        return alertsHtml
      })
  }

  function generateTokenInfo() {
    // console.log("generateTokenInfo currentTokenData: ", currentTokenData)
    return tokens.map((token) => {
      return (
        <>
        <tr>
          <td>{token.name}</td>
          <td>{(parseFloat(ethPriceInUsd) * parseFloat(token.derivedETH)).toFixed(4)}</td>
          <td>{parseFloat(token.derivedETH).toFixed(6)}</td>
        </tr>
        <tr>
          <td>Alerts</td><td colSpan="2">{findAlerts(token.id)}</td>
        </tr>
        </>
      )
    })
  }


  return (
      <div className="content" style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f4f3ef"
      }}>
        <Row>
          <Col md="12">
            <Card  style={{ width: '48rem' }}>
              <CardHeader>Tokens{'  ||  refresh count: '}{refreshCounter.current}</CardHeader>
              <CardBody>
                <Table responsive>
                  <thead className="text-primary">
                    <tr>
                      <th>Token name</th>
                      <th>Token price USD</th>
                      <th>Token price ETH</th>
                    </tr>
                  </thead>
                  <tbody>
                    { multiTokensLoading
                        ?  <tr><td>"Lading multi-tokens.."</td></tr>
                        :  generateTokenInfo()
                    }
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
  );
}

export default App
