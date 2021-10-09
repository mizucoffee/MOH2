class Eraser < ActiveRecord::Migration[5.2]
  def change
    create_table :erasers do |t|
      t.decimal :x
      t.decimal :y
      t.timestamps null: false
    end
  end
end