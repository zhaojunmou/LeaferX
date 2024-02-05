import { Rect , App , Text , Line} from 'leafer-ui'
import { EditorMoveEvent } from './src/event/EditorMoveEvent'
import { EditorEvent } from './src/event/EditorEvent'
import { Editor } from './src' // 引入插件代码


// const leafer = new Leafer({ view: window })
const app = new App({ 
    view: window
})

app.tree = app.addLeafer()
app.sky = app.addLeafer({ type: 'draw', usePartRender: false })

const editor = app.editor = new Editor()
app.sky.add(app.editor)

const rect1 = new Rect({
    x: 100,
    y: 100,
    width: 100,
    height: 100,
    fill: '#32cd79',
    editable: true
})
const rect2 = new Rect({
    x: 150,
    y: 150,
    width: 100,
    height: 100,
    fill: '#7932cd',
    editable: true
})

const line1 = new Line({
    points:[30,10,50,36,70,10,112,60],
    curve:0.5,
    strokeWidth:3,
    stroke: '#3279cd',
    editable: true
})

const line2 = new Line({
    x:100,
    y:80,
    width:200,
    strokeWidth:3,
    stroke: '#9c327d',
    editable: true
})

const x = new Text({
    text:'x:'
})
const y = new Text({
    text:'y:',
    y:20
})

const selectCount = new Text({
    text:'count:',
    y:40
})

editor.on(EditorMoveEvent.MOVE,(e)=>{
    x.text = 'x:' + e.target.x
    y.text = 'y:' + e.target.y
})

editor.on(EditorEvent.SELECT,(e)=>{
    selectCount.text = 'count:' + e.editor.list.length
    console.log(e.value.tag)
})

app.tree.addMany(rect1,rect2,line1,line2,x,y,selectCount)
// app.tree.add(rect2)
// app.tree.add(line)
// app.tree.add(x)
// app.tree.add(y)
// app.tree.add(selectCount)

// console.log( new Editor() ) 