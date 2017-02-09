import Most, {connect} from 'react-most'
import ReactDOM from 'react-dom'
import React from 'react'
import * as most from 'most'
import rest from 'rest'
const GITHUB_SEARCH_API = 'https://api.github.com/search/repositories?q=';
const TypeNsearch = (props)=>{
  let {search} = props.actions
  let error = props.error||{}
  return <div>
    <input onChange={e=>search(e.target.value)}></input>
    <span className={"red " + error.className}>{error.message}</span>
    <ul>
      {props.results&&props.results.map(item=>{
        return <li key={item.id}><a href={item.html_url}>{item.full_name} ({item.stargazers_count})</a></li>
  })}
    </ul>
  </div>
}
const log = x=>console.log(x)
const MostTypeNSearch = connect(function(intent$){
  let search$ = intent$.filter(i=>i.type=='search')
                           .map(intent=>intent.value.trim())
                           .skipRepeats()

  let clearSink$ = search$.filter(query=>query.length === 0)
                           .map(_=>state=>({results: []}))

  let updateSink$ = search$.filter(query => query.length > 0)
                           .debounce(500)
                           .map(query=>GITHUB_SEARCH_API + query)
                           .map(url=>rest(url).then(resp=>({
                               type: 'dataUpdate',
                               value: resp.entity
                           })).catch(error=>{
                             console.error('API REQUEST ERROR:', error)
                             return {
                               type: 'dataError',
                               value: error.message
                             }
                           }))
                           .flatMap(most.fromPromise)
                           .filter(i=>i.type=='dataUpdate')
                           .map(data=>JSON.parse(data.value).items)
                           .map(items=>items.slice(0,10))
                           .map(items=>state=>({results: items}))
                           .flatMapError(error=>{
                             console.log('[CRITICAL ERROR]:', error);
                             return most.of({message:error.error,className:'display'})
                                        .merge(most.of({className:'hidden'}).delay(3000))
                                        .map(error=>state=>({error}))
                           })

  return {
    search: value=>({type:'search',value}),
    clearSink$,
    updateSink$,
  }
})(TypeNsearch);

ReactDOM.render(<Most>
    <MostTypeNSearch/>
</Most>, document.getElementById('app'));
