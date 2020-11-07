import React, { useEffect, useState, useRef } from 'react'
import { Table } from 'reactstrap'


const dexToolsLink = 'https://www.dextools.io/app/uniswap/pair-explorer/'


export const AlertTable = ({multiTokensLoading, tokens, ethPriceInUsd, tokenJson}) => {

  /**** functions ****/

  function findDexToolsLink(tokenAddress) {
    const { dexToolsLinkSuffix: linkSuffix } = tokenJson.find(tokenInfo => tokenInfo.address === tokenAddress)
    return `${dexToolsLink}${linkSuffix}`
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
  );
}
