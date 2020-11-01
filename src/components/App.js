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

//TODO move to useRef
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

  const daiPriceInEth = daiData && daiData.tokens[0].derivedETH
  const tokens = multiTokensData && multiTokensData.tokens
  const ethPriceInUsd = ethPriceData && ethPriceData.bundles[0].ethPrice

  console.log('tokenData ', tokens)
  refreshCounter.current++
  updateAlerts()

  /**** functions ****/

  function checkAlert(token) {
    const { alerts: tokenAlerts } = tokenJson.find(tokenInfo => tokenInfo.address === token.id) //.map(tokenInfo => tokenInfo.alerts)
    if(!tokenAlerts) { console.log('Token not found in Json config file: ', token);  return false }

    console.log('checkAlert : tokenInfo : ', tokenJson.find(tokenInfo => tokenInfo.address === token.id))
    console.log('checkAlert : token alerts : ', tokenAlerts)
    const firstIncompleteAlert = tokenAlerts.find(alert => !alert.completed)
    console.log('checkAlert : First incomplete alter : ', firstIncompleteAlert)
    if(firstIncompleteAlert) { //if there is incomplete alert
      const usdTokenPrice = (parseFloat(ethPriceInUsd) * parseFloat(token.derivedETH)).toFixed(4)
      console.log('checkAlert : usdToken price : ', usdTokenPrice)
      if(firstIncompleteAlert.type === '>' && usdTokenPrice >= parseFloat(firstIncompleteAlert.value)) return [true, firstIncompleteAlert]
      if(firstIncompleteAlert.type === '<' && usdTokenPrice <= parseFloat(firstIncompleteAlert.value)) return [true, firstIncompleteAlert]
    }
    return [false, null]
  }

  function updateAlerts() {
    if(multiTokensLoading || ethLoading) console.log('update tokens waiting for tokens to load', tokens)
    else {
      console.log('update tokens :', tokens)
      tokens.forEach(token => {
        const [isAlertActive, tokenAlert] = checkAlert(token)

        // if (checkAlert(token)) {
        if (isAlertActive) {
          console.log('alert for token ', token.name)
          tokenAlert.completed = true
          console.log('alert for token value ', tokenAlert)

        }
      })
    }
  }

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

  function printAlerts(tokenAddress) {
    return tokenJson
      .filter(tokenInfo => tokenInfo.address === tokenAddress)  //TODO: find nie filter bo filter zwraca tablice
      .map(tokenInfo => {
        // tokenInfo.alerts.map(alert => console.log('alert : ', alert))
        return tokenInfo.alerts.map(alert => printAlert(alert))
      })
  }

  function generateTokenInfo() {
    return tokens.map((token) => {
      return (
        <>
        <tr>
          <td>{token.name}</td>
          <td>{(parseFloat(ethPriceInUsd) * parseFloat(token.derivedETH)).toFixed(4)}</td>
          <td>{parseFloat(token.derivedETH).toFixed(6)}</td>
        </tr>
        <tr>
          <td>Alerts</td><td colSpan="2">{printAlerts(token.id)}</td>
        </tr>
        </>
      )
    })
  }

  /******** render ********/

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
              <CardHeader>Tokens<div style={{float: 'right'}}>Refresh count : {refreshCounter.current}</div></CardHeader>
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
