import React, { useEffect, useState, useRef } from 'react'
import './App.css'

import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import { useQuery } from '@apollo/react-hooks'
import gql from 'graphql-tag'
// import tokenJson from '../data/tokens.json'
import tokenJson from '../data/tokens.json'

import { Card, CardHeader, CardBody, Row, Col, Table } from 'reactstrap'
import { TelegramClient } from 'messaging-api-telegram'


export const client = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2'
  }),
  fetchOptions: {
    mode: 'no-cors'
  },
  cache: new InMemoryCache()
})

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

const dexToolsLink = 'https://www.dextools.io/app/uniswap/pair-explorer/'

//TODO: move to environment vars
const chatId =-419695018
const telegramClient = new TelegramClient({
  accessToken: '1391851877:AAHPd3W7_tgLoCZ3i-sG8fbXZew_rmBD5Rw',
})

//TODO: move to some sort of initialization function or hook (useEffect ?)
telegramClient.getWebhookInfo().catch((error) => {
  console.log(error) // formatted error message
  console.log(error.stack) // error stack trace
  console.log(error.config) // axios request config
  console.log(error.request) // HTTP request
  console.log(error.response) // HTTP response
});

//TODO move to useRef or this kind of global declaration if also ok ?
const tokenAddresses = tokenJson.map(tokenInfo => tokenInfo.address)

// TODO clear; devDependencies
// should I use gulp or webpack?

function App() {

  const refreshCounter = useRef(-1)

  const { loading: ethLoading, data: ethPriceData } = useQuery(ETH_PRICE_QUERY, { pollInterval: 3000 })

  const { loading: multiTokensLoading, data: multiTokensData } = useQuery(MULTI_TOKEN_QUERY, {
    variables:  {
      tokenAddresses: tokenAddresses
    },
    pollInterval: 30000
  })

  const tokens = multiTokensData && multiTokensData.tokens
  const ethPriceInUsd = ethPriceData && ethPriceData.bundles[0].ethPrice

  console.log('tokenData ', tokens)
  refreshCounter.current++
  updateAlerts()

  /**** functions ****/

  function sendTelegramMessage(message) {
    telegramClient.sendMessage(chatId, message).then(() => {
      console.log('message sent', message);
    });
  }

  function findDexToolsLink(tokenAddress) {
    const { dexToolsLinkSuffix: linkSuffix } = tokenJson.find(tokenInfo => tokenInfo.address === tokenAddress)
    return `${dexToolsLink}${linkSuffix}`
  }

  function checkAlert(token) {
    const { alerts: tokenAlerts } = tokenJson.find(tokenInfo => tokenInfo.address === token.id)
    if(!tokenAlerts) { console.log('Token not found in Json config file: ', token);  return false }

    const firstIncompleteAlert = tokenAlerts.find(alert => !alert.completed)
    if(firstIncompleteAlert) { //if there is incomplete alert found (otherwise it will be undefined value)
      const usdTokenPrice = (parseFloat(ethPriceInUsd) * parseFloat(token.derivedETH)).toFixed(4)
      console.log(`checkAlert : First incomplete alert : ${firstIncompleteAlert} for token ${token.name}, with current price: ${usdTokenPrice}`)
      if(firstIncompleteAlert.type === '>' && usdTokenPrice >= parseFloat(firstIncompleteAlert.value)) return [true, firstIncompleteAlert]
      if(firstIncompleteAlert.type === '<' && usdTokenPrice <= parseFloat(firstIncompleteAlert.value)) return [true, firstIncompleteAlert]
    }
    return [false, null]
  }

  function updateAlerts() {
    if(multiTokensLoading || ethLoading) console.log('update tokens waiting for tokens to load', tokens)
    else {
      tokens.forEach(token => {
        const [isAlertActive, tokenAlert] = checkAlert(token)
        if (isAlertActive) {
          const usdTokenPrice = (parseFloat(ethPriceInUsd) * parseFloat(token.derivedETH)).toFixed(4)
          const msg = `Token alert: ${token.name} ${tokenAlert.type} ${tokenAlert.value}, price: ${usdTokenPrice}`
          console.log(msg)
          sendTelegramMessage(msg)
          tokenAlert.completed = true
        }
      })
    }
  }

  function printAlert(alert) {
    return (
      <div style={{color: alert.type === '>' ? 'green' : 'red', float: 'left'}}>
        { alert.completed
            ? <b><s>{alert.value}&nbsp;&nbsp;</s></b>
            : <b>{alert.value}&nbsp;&nbsp;</b>
        }
      </div>
    )
  }

  function printAlerts(tokenAddress) {
    return tokenJson
      .filter(tokenInfo => tokenInfo.address === tokenAddress)  //TODO: find would be better coz filter returns an array (hence double map below)
      .map(tokenInfo => tokenInfo.alerts.map(alert => printAlert(alert)))
  }

  function generateTokenInfo() {
    return tokens.map((token) => {
      return (
        <>
        <tr>
          <td>{token.name}</td>
          <td>{(parseFloat(ethPriceInUsd) * parseFloat(token.derivedETH)).toFixed(4)}</td>
          <td>{parseFloat(token.derivedETH).toFixed(6)}</td>
          <td><a href={`${findDexToolsLink(token.id)}`} target="_blank"><b>dex</b></a></td>
        </tr>
        <tr>
          <td>Alerts</td><td colSpan="3">{printAlerts(token.id)}</td>
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
                      <th>Link to dexTools</th>
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
