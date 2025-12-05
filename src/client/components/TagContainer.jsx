import Tag from "./Tag";

const TagContainer = ({tags = []}) => {
  return (
    <div style={{display: "grid", grid:"auto-flow dense / repeat(4, 1fr)", columnGap: 3, margin: "4px auto", rowGap: 3}}>
      {
        tags.map((t, i) => <Tag data={t} key={i}/>)
      }
    </div>
  )
}

export default TagContainer;