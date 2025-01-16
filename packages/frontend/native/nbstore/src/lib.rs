pub mod blob;
pub mod doc;
pub mod error;
pub mod pool;
pub mod storage;
pub mod sync;

use chrono::NaiveDateTime;
use napi::bindgen_prelude::*;
use napi_derive::napi;
use pool::SqliteDocStoragePool;

#[cfg(feature = "use-as-lib")]
type Result<T> = anyhow::Result<T>;

#[cfg(not(feature = "use-as-lib"))]
type Result<T> = napi::Result<T>;

#[cfg(not(feature = "use-as-lib"))]
impl From<error::Error> for napi::Error {
  fn from(err: error::Error) -> Self {
    napi::Error::new(napi::Status::GenericFailure, err.to_string())
  }
}

#[cfg(feature = "use-as-lib")]
pub type Data = Vec<u8>;

#[cfg(not(feature = "use-as-lib"))]
pub type Data = Uint8Array;

#[napi(object)]
pub struct DocUpdate {
  pub doc_id: String,
  pub timestamp: NaiveDateTime,
  #[napi(ts_type = "Uint8Array")]
  pub bin: Data,
}

#[napi(object)]
pub struct DocRecord {
  pub doc_id: String,
  #[napi(ts_type = "Uint8Array")]
  pub bin: Data,
  pub timestamp: NaiveDateTime,
}

#[derive(Debug)]
#[napi(object)]
pub struct DocClock {
  pub doc_id: String,
  pub timestamp: NaiveDateTime,
}

#[napi(object)]
pub struct SetBlob {
  pub key: String,
  #[napi(ts_type = "Uint8Array")]
  pub data: Data,
  pub mime: String,
}

#[napi(object)]
pub struct Blob {
  pub key: String,
  #[napi(ts_type = "Uint8Array")]
  pub data: Data,
  pub mime: String,
  pub size: i64,
  pub created_at: NaiveDateTime,
}

#[napi(object)]
pub struct ListedBlob {
  pub key: String,
  pub size: i64,
  pub mime: String,
  pub created_at: NaiveDateTime,
}

#[napi]
pub struct DocStoragePool {
  pool: SqliteDocStoragePool,
}

#[napi]
impl DocStoragePool {
  #[napi(constructor, async_runtime)]
  pub fn new() -> Result<Self> {
    Ok(Self {
      pool: SqliteDocStoragePool::default(),
    })
  }

  #[napi]
  /// Initialize the database and run migrations.
  pub async fn connect(&self, universal_id: String, path: String) -> Result<()> {
    self.pool.connect(universal_id, path).await?;
    Ok(())
  }

  #[napi]
  pub async fn disconnect(&self, universal_id: String) -> Result<()> {
    self.pool.disconnect(universal_id).await?;
    Ok(())
  }

  #[napi]
  pub async fn set_space_id(&self, universal_id: String, space_id: String) -> Result<()> {
    self
      .pool
      .ensure_storage(universal_id)?
      .set_space_id(space_id)
      .await?;
    Ok(())
  }

  #[napi]
  pub async fn push_update(
    &self,
    universal_id: String,
    doc_id: String,
    update: Uint8Array,
  ) -> Result<NaiveDateTime> {
    Ok(
      self
        .pool
        .ensure_storage(universal_id)?
        .push_update(doc_id, update)
        .await?,
    )
  }

  #[napi]
  pub async fn get_doc_snapshot(
    &self,
    universal_id: String,
    doc_id: String,
  ) -> Result<Option<DocRecord>> {
    Ok(
      self
        .pool
        .ensure_storage(universal_id)?
        .get_doc_snapshot(doc_id)
        .await?,
    )
  }

  #[napi]
  pub async fn set_doc_snapshot(&self, universal_id: String, snapshot: DocRecord) -> Result<bool> {
    Ok(
      self
        .pool
        .ensure_storage(universal_id)?
        .set_doc_snapshot(snapshot)
        .await?,
    )
  }

  #[napi]
  pub async fn get_doc_updates(
    &self,
    universal_id: String,
    doc_id: String,
  ) -> Result<Vec<DocUpdate>> {
    Ok(
      self
        .pool
        .ensure_storage(universal_id)?
        .get_doc_updates(doc_id)
        .await?,
    )
  }

  #[napi]
  pub async fn mark_updates_merged(
    &self,
    universal_id: String,
    doc_id: String,
    updates: Vec<NaiveDateTime>,
  ) -> Result<u32> {
    Ok(
      self
        .pool
        .ensure_storage(universal_id)?
        .mark_updates_merged(doc_id, updates)
        .await?,
    )
  }

  #[napi]
  pub async fn delete_doc(&self, universal_id: String, doc_id: String) -> Result<()> {
    self
      .pool
      .ensure_storage(universal_id)?
      .delete_doc(doc_id)
      .await?;
    Ok(())
  }

  #[napi]
  pub async fn get_doc_clocks(
    &self,
    universal_id: String,
    after: Option<NaiveDateTime>,
  ) -> Result<Vec<DocClock>> {
    Ok(
      self
        .pool
        .ensure_storage(universal_id)?
        .get_doc_clocks(after)
        .await?,
    )
  }

  #[napi]
  pub async fn get_doc_clock(
    &self,
    universal_id: String,
    doc_id: String,
  ) -> Result<Option<DocClock>> {
    Ok(
      self
        .pool
        .ensure_storage(universal_id)?
        .get_doc_clock(doc_id)
        .await?,
    )
  }

  #[napi]
  pub async fn get_blob(&self, universal_id: String, key: String) -> Result<Option<Blob>> {
    Ok(
      self
        .pool
        .ensure_storage(universal_id)?
        .get_blob(key)
        .await?,
    )
  }

  #[napi]
  pub async fn set_blob(&self, universal_id: String, blob: SetBlob) -> Result<()> {
    self
      .pool
      .ensure_storage(universal_id)?
      .set_blob(blob)
      .await?;
    Ok(())
  }

  #[napi]
  pub async fn delete_blob(
    &self,
    universal_id: String,
    key: String,
    permanently: bool,
  ) -> Result<()> {
    self
      .pool
      .ensure_storage(universal_id)?
      .delete_blob(key, permanently)
      .await?;
    Ok(())
  }

  #[napi]
  pub async fn release_blobs(&self, universal_id: String) -> Result<()> {
    self
      .pool
      .ensure_storage(universal_id)?
      .release_blobs()
      .await?;
    Ok(())
  }

  #[napi]
  pub async fn list_blobs(&self, universal_id: String) -> Result<Vec<ListedBlob>> {
    Ok(self.pool.ensure_storage(universal_id)?.list_blobs().await?)
  }

  #[napi]
  pub async fn get_peer_remote_clocks(
    &self,
    universal_id: String,
    peer: String,
  ) -> Result<Vec<DocClock>> {
    Ok(
      self
        .pool
        .ensure_storage(universal_id)?
        .get_peer_remote_clocks(peer)
        .await?,
    )
  }

  #[napi]
  pub async fn get_peer_remote_clock(
    &self,
    universal_id: String,
    peer: String,
    doc_id: String,
  ) -> Result<Option<DocClock>> {
    Ok(
      self
        .pool
        .ensure_storage(universal_id)?
        .get_peer_remote_clock(peer, doc_id)
        .await?,
    )
  }

  #[napi]
  pub async fn set_peer_remote_clock(
    &self,
    universal_id: String,
    peer: String,
    doc_id: String,
    clock: NaiveDateTime,
  ) -> Result<()> {
    self
      .pool
      .ensure_storage(universal_id)?
      .set_peer_remote_clock(peer, doc_id, clock)
      .await?;
    Ok(())
  }

  #[napi]
  pub async fn get_peer_pulled_remote_clocks(
    &self,
    universal_id: String,
    peer: String,
  ) -> Result<Vec<DocClock>> {
    Ok(
      self
        .pool
        .ensure_storage(universal_id)?
        .get_peer_pulled_remote_clocks(peer)
        .await?,
    )
  }

  #[napi]
  pub async fn get_peer_pulled_remote_clock(
    &self,
    universal_id: String,
    peer: String,
    doc_id: String,
  ) -> Result<Option<DocClock>> {
    Ok(
      self
        .pool
        .ensure_storage(universal_id)?
        .get_peer_pulled_remote_clock(peer, doc_id)
        .await?,
    )
  }

  #[napi]
  pub async fn set_peer_pulled_remote_clock(
    &self,
    universal_id: String,
    peer: String,
    doc_id: String,
    clock: NaiveDateTime,
  ) -> Result<()> {
    self
      .pool
      .ensure_storage(universal_id)?
      .set_peer_pulled_remote_clock(peer, doc_id, clock)
      .await?;
    Ok(())
  }

  #[napi]
  pub async fn get_peer_pushed_clocks(
    &self,
    universal_id: String,
    peer: String,
  ) -> Result<Vec<DocClock>> {
    Ok(
      self
        .pool
        .ensure_storage(universal_id)?
        .get_peer_pushed_clocks(peer)
        .await?,
    )
  }

  #[napi]
  pub async fn get_peer_pushed_clock(
    &self,
    universal_id: String,
    peer: String,
    doc_id: String,
  ) -> Result<Option<DocClock>> {
    Ok(
      self
        .pool
        .ensure_storage(universal_id)?
        .get_peer_pushed_clock(peer, doc_id)
        .await?,
    )
  }

  #[napi]
  pub async fn set_peer_pushed_clock(
    &self,
    universal_id: String,
    peer: String,
    doc_id: String,
    clock: NaiveDateTime,
  ) -> Result<()> {
    self
      .pool
      .ensure_storage(universal_id)?
      .set_peer_pushed_clock(peer, doc_id, clock)
      .await?;
    Ok(())
  }

  #[napi]
  pub async fn clear_clocks(&self, universal_id: String) -> Result<()> {
    self
      .pool
      .ensure_storage(universal_id)?
      .clear_clocks()
      .await?;
    Ok(())
  }
}
