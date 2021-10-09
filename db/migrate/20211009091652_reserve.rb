class Reserve < ActiveRecord::Migration[5.2]
  def change
    create_table :reserve_nums do |t|
      t.integer :player_id
      t.timestamps null: false
    end
  end
end
