create index introduction_trusted_contact_source_idx
  on private.introduction_trusted_contact_shares (source_contact_id)
  where source_contact_id is not null;
