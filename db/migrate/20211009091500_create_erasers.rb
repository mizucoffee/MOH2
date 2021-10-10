class CreateErasers < ActiveRecord::Migration[6.1]
  def change
    create_table :erasers do |t|
      t.decimal :x
      t.decimal :y
      t.timestamps null: false
    end
  end
end
