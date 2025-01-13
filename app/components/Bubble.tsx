const Bubble = ({ message, content }) => {
  const { role } = message;
  return (
    <div className={`${role} bubble`}>{content}</div>
  )
};

export default Bubble;