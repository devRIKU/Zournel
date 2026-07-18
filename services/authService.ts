export const getLocalUserId = () => {
  let id = localStorage.getItem('mf_local_user_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('mf_local_user_id', id);
  }
  return id;
};

export const setLocalUserId = (id: string) => {
  localStorage.setItem('mf_local_user_id', id.trim());
};
