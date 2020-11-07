import React, { useEffect, useState, useRef } from 'react'
import './App.css'

import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import { useQuery } from '@apollo/react-hooks'
import gql from 'graphql-tag'
// import tokenJson from '../data/tokens.json'
import tokenJson from '../data/tokens_draft_v3.json'

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

  function checkAlert(token, tokenAlerts, compareFunc, alertType) {
    if(!tokenAlerts) { console.log('Token not found in Json config file: ', token);  return [false, null] }

    const firstIncompleteAlert = tokenAlerts.find(alert => !alert.completed)
    if(firstIncompleteAlert) { //if there is incomplete alert found (otherwise it will be undefined value)
      const usdTokenPrice = (parseFloat(ethPriceInUsd) * parseFloat(token.derivedETH)).toFixed(4)
      console.log(`checkAlert : First incomplete alert ${alertType} : ${firstIncompleteAlert.value} for token ${token.name}, with current price: ${usdTokenPrice}`)
      if(compareFunc(usdTokenPrice, parseFloat(firstIncompleteAlert.value))) return [true, firstIncompleteAlert]
    }
    return [false, null]
  }

  function checkAlertUp(token) {
    const { alertsUp: tokenAlerts } = tokenJson.find(tokenInfo => tokenInfo.address === token.id)
    const isUp = (priceOne, priceTwo) => priceOne >= priceTwo
    return checkAlert(token, tokenAlerts, isUp, "UP")
  }

  function checkAlertDown(token) {
    const { alertsDown: tokenAlerts } = tokenJson.find(tokenInfo => tokenInfo.address === token.id)
    const isDown = (priceOne, priceTwo) => priceOne <= priceTwo
    return checkAlert(token, tokenAlerts, isDown, "DOWN")
  }

  function alertOnChange(token, isAlertActive, tokenAlert, alertType) {
    if (isAlertActive) {
      const usdTokenPrice = (parseFloat(ethPriceInUsd) * parseFloat(token.derivedETH)).toFixed(4)
      const msg = `Token alert: ${token.name} ${alertType} ${tokenAlert.value}$, price: ${usdTokenPrice}$`
      console.log(msg)
      sendTelegramMessage(msg)
      tokenAlert.completed = true
    }
  }

  function updateAlerts() {
    if(multiTokensLoading || ethLoading) console.log('update tokens waiting for tokens to load', tokens)
    else {
      tokens.forEach(token => {
        const [isAlertActiveUp, tokenAlertUp] = checkAlertUp(token)
        const [isAlertActiveDown, tokenAlertDown] = checkAlertDown(token)
        alertOnChange(token, isAlertActiveUp, tokenAlertUp, 'UP')
        alertOnChange(token, isAlertActiveDown, tokenAlertDown, 'DOWN')
      })
    }
  }

  function printAlert(alert, colorAlert) {
    return (
      <div style={{color: colorAlert, float: 'left'}}>
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
      .map(tokenInfo => {
        return(
          <>
            { tokenInfo.alertsUp.map(alert => printAlert(alert, 'green')) }
            { tokenInfo.alertsDown.map(alert => printAlert(alert, 'red')) }
          </>
        )
      })
  }

  function generateTokenInfo() {
    return tokens.map((token) => {
      return (
        <>
          <tr>
            <td>{token.name}</td>
            <td><b>{(parseFloat(ethPriceInUsd) * parseFloat(token.derivedETH)).toFixed(4)}</b></td>
            <td>{parseFloat(token.derivedETH).toFixed(6)}</td>
            <td>{printAlerts(token.id)}</td>
            <td><a href={`${findDexToolsLink(token.id)}`} target="_blank"><b>dex</b></a></td>
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
            <Card  style={{ width: '68rem' }}>
              <CardHeader>
                <div style={{float: 'left', marginRight: '0.8rem'}}>Tokens</div>
                <div style={{float: 'right', marginLeft: '0.8rem'}}>Refresh count : {refreshCounter.current}</div>
                <div style={{float: 'right', marginRight: '0.8rem'}}><b>Eth price : {parseFloat(ethPriceInUsd).toFixed(2)}</b></div>
              </CardHeader>
              <CardBody>
                <Table responsive>
                  <thead className="text-primary">
                    <tr>
                      <th>Token name</th>
                      <th>Token price USD</th>
                      <th>Token price ETH</th>
                      <th>Token alerts</th>
                      <th>dexTools</th>
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
